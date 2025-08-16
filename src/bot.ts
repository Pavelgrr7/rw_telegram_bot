// src/bot.ts
import 'dotenv/config';
import { Telegraf, session, Scenes, Markup, Context } from 'telegraf';
import { applicationScene } from './scenes/application.scene';
import {RwBotContext} from "./scenes/context.interfaces";

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('BOT_TOKEN must be provided in .env file!');
}

const bot = new Telegraf<RwBotContext>(token);
//todo redis
bot.use(session());

const stage = new Scenes.Stage<RwBotContext>([applicationScene], {
});
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

bot.command('start', (ctx) => {
    ctx.reply(
        `Вас приветствует бот ${process.env.BOT_NAME}. Оставьте заявку на проектирование или консультацию, и мы свяжемся с вами в ближайшее время.`,
        // Кнопка под сообщением
        Markup.inlineKeyboard([
            // Кнопка с callback-запросом
            Markup.button.callback('Оставить заявку', 'start_application'),
        ])
    );
});

// action - callback-запросы от кнопок
bot.action('start_application', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('applicationScene');
});

bot.command('cancel', async (ctx) => {
    await ctx.reply('Действие отменено.');
    // Выход из текущей сцены
    return ctx.scene.leave();
});

bot.launch();

console.log('Bot started...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));