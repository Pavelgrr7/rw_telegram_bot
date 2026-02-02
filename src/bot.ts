// src/bot.ts
import 'dotenv/config';
import { Telegraf, session, Scenes, Markup, Context } from 'telegraf';
import { applicationScene } from './scenes/application.scene';
import {ApplicationWizardSession, RwBotContext} from "./scenes/context.interfaces";
import { Redis } from "@telegraf/session/redis";
import {createClient} from "redis";
import { RedisService } from './services/redis.service';
import {ACTION_NAMES} from "./constants";
import { startWebServer } from './web.application.handler';
import startApplicationHandler from "./handlers/start.app.handler";
import { NotificationService } from './services/notification.service';
import { TelegramTransport } from './transport/impl/tg.bot.transport';

const token = process.env.BOT_TOKEN;

// Список, если понадобится добавить ещё аккаунты
// Используется в TelegramTransport для отправки сообщений о новых заявках в telegram
const adminIds: string[] = [
    process.env.ADMIN_CHAT_ID,
    process.env.ADMIN_SCND_CHAT_ID,
    ].filter((id): id is string => !!id);

if (!token) {
    throw new Error('BOT_TOKEN must be provided in .env file!');
}

type Session = Scenes.SceneSession<ApplicationWizardSession>;

const redisUrl = `redis://${process.env.REDIS_HOST || '127.0.0.1'}:6379`;
const redisClient = createClient({
    url: redisUrl,
});

export const redisService = new RedisService(redisClient as any);

const store = Redis<Session>({
    client: redisClient,
});

const bot = new Telegraf<RwBotContext>(process.env.BOT_TOKEN!);

bot.use(session({ store }));

const stage = new Scenes.Stage<RwBotContext>([applicationScene], {});
bot.use(stage.middleware());

bot.command('start', async (ctx) => {
    const initMsg = await ctx.reply(
        `Вас приветствует бот ${process.env.BOT_NAME}. ...`,
        Markup.inlineKeyboard([
            Markup.button.callback('Оставить заявку', ACTION_NAMES.START_APPLICATION),
        ])
    );
    ctx.scene.session.toDeleteMsgId = initMsg.message_id;
});
bot.action(ACTION_NAMES.START_APPLICATION, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await startApplicationHandler(ctx);
});

bot.action('another_application', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await startApplicationHandler(ctx);
});

bot.hears('Новая заявка', async (ctx) => {
    await startApplicationHandler(ctx);
});

bot.action(ACTION_NAMES.ANOTHER_APPLICATION, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();

    // @ts-ignore
    ctx.session.__scenes = {};

    await ctx.scene.enter('applicationScene');
});

bot.action(ACTION_NAMES.CONTINUE_APPLICATION, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();

    await ctx.scene.enter('applicationScene');
});

// фоновый воркер для отправки тех заявок, которые по какой-либо причине не смогли отправиться сразу
const RETRY_INTERVAL_MS = 10 * 60 * 1000; // Проверять каждые 10 минут

const startRetryWorker = () => {
    console.log(`Starting retry worker. Interval: ${RETRY_INTERVAL_MS / 1000}s`);

    setInterval(async () => {
        console.log('Worker: Checking for failed applications...');

        let application = await redisService.getOldestFailedApplication();

        // Обрабатываем все заявки, которые есть в очереди на данный момент
        while (application) {
            console.log('Worker: Found a failed application. Retrying to send...');
            const summary = `Новая заявка.\n
От пользователя: ${application.user}
    
Тип: ${application.projectType || 'Не указан'}
Площадь: ${application.area || 'Не указана'} м²
Местоположение: ${application.location || 'Не указано'}
Бюджет: ${application.budget || 'Не указан'} руб
Доп. Инфо: ${application.info || 'Не указано'}
Имя: ${application.name || 'Не указано'}
Контакт: ${application.phone || 'Не указан'}`;

            try {
                // Пытаемся отправить снова
                // @ts-ignore
                await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, summary);
                // @ts-ignore
                await bot.telegram.sendMessage(process.env.ADMIN_SCND_CHAT_ID, summary);
                console.log('Worker: Successfully resent application.');
            } catch (error) {
                // @ts-ignore
                console.error('Worker: Retry failed. Returning application to queue.', error.message);
                await redisService.addFailedApplicationToQueue(application);
                break;
            }

            application = await redisService.getOldestFailedApplication();
        }

    }, RETRY_INTERVAL_MS);
};

bot.launch();

// Инициализация NotificationService
// Ему необходимо передать экземпляр класса-наследника от itransport,
// интерфейса из ./src/transport/inotification.transport.ts.
// В пакете impl можно добавлять различные реализации этого интерфейса и таким образом переключаться
// между разными способами доставки сообщений о заявке

const transport = new TelegramTransport(bot, adminIds);
export const notificationService = new NotificationService(transport, redisService);

startRetryWorker();

// Сервер слушает порт 3000 и бросает заявки в NotificationService
startWebServer();

console.log('Bot started...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
