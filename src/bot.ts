// src/bot.ts
import 'dotenv/config';
import { Telegraf, session, Scenes, Markup, Context } from 'telegraf';
import { applicationScene } from './scenes/application.scene';
import {ApplicationWizardSession, RwBotContext} from "./scenes/context.interfaces";
import { Redis } from "@telegraf/session/redis";
import {createClient} from "redis";
const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('BOT_TOKEN must be provided in .env file!');
}
type Session = Scenes.SceneSession<ApplicationWizardSession>;
const redisUrl = `redis://${process.env.REDIS_HOST || '127.0.0.1'}:6379`;

const redisClient = createClient({
    url: redisUrl,
});

// redisClient.connect().catch(console.error);

const store = Redis<Session>({
    client: redisClient,
});

const bot = new Telegraf<RwBotContext>(process.env.BOT_TOKEN!);

bot.use(session({ store }));


const stage = new Scenes.Stage<RwBotContext>([applicationScene], {});
bot.use(stage.middleware());

bot.start(async (ctx) => {
    await ctx.reply(
        `Вас приветствует бот ${process.env.BOT_NAME}. Оставьте заявку на проектирование или консультацию, и мы свяжемся с вами в ближайшее время.`,
        // Кнопка под сообщением
        Markup.inlineKeyboard([
            // Кнопка с callback-запросом
            Markup.button.callback('Оставить заявку', 'start_application'),
        ])
    );
});

bot.command('start', async (ctx) => {
    const initMsg = await ctx.reply(
        `Вас приветствует бот ${process.env.BOT_NAME}. Оставьте заявку на проектирование или консультацию, и мы свяжемся с вами в ближайшее время.`,
        // Кнопка под сообщением
        Markup.inlineKeyboard([
            // Кнопка с callback-запросом
            Markup.button.callback('Оставить заявку', 'start_application'),
        ])
    );
    ctx.scene.session.toDeleteMsgId = initMsg.message_id;

});

// action - callback-запросы от кнопок
bot.action('start_application', async (ctx) => {
    await ctx.answerCbQuery();
    const existingState = ctx.session?.__scenes?.applicationState;
    if (existingState && Object.keys(existingState).length > 0) {
        await ctx.reply(
            'У вас есть незавершенная заявка. Хотите продолжить ее заполнение?',
            Markup.inlineKeyboard([
                Markup.button.callback('Продолжить', 'continue_application'),
                Markup.button.callback('Начать новую', 'another_application'),
            ])
        );
    } else {
        return ctx.scene.enter('applicationScene');
    }
});

bot.action('another_application', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        await ctx.deleteMessage();
    } catch (e) { console.warn("Couldn't delete message, maybe it was already deleted."); }

    ctx.session.__scenes = {};

    // Используем enter, а не reenter, потому что мы входим в сцену "с нуля".
    await ctx.scene.enter('applicationScene');
});

bot.action('continue_application', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();

    await ctx.scene.enter('applicationScene', ctx.session.__scenes?.applicationState);

});


bot.launch();

console.log('Bot started...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
