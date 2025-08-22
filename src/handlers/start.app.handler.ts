import { RwBotContext } from '../scenes/context.interfaces';
import {Markup} from "telegraf";
import {ACTION_NAMES} from "../constants"; // Убедитесь, что тип импортирован

const startApplicationHandler = async (ctx: RwBotContext) => {
    // Получаем состояние из сессии
    const existingState = ctx.session?.__scenes?.applicationState;

    if (existingState && Object.keys(existingState).length > 0) {
        // Если есть черновик, предлагаем выбор
        await ctx.reply(
            'У вас есть незавершенная заявка. Хотите продолжить ее заполнение?',
            Markup.inlineKeyboard([
                Markup.button.callback('Продолжить', ACTION_NAMES.CONTINUE_APPLICATION),
                Markup.button.callback('Начать новую', ACTION_NAMES.ANOTHER_APPLICATION),
            ])
        );
    } else {
        return ctx.scene.enter('applicationScene');
    }
};

export default startApplicationHandler;