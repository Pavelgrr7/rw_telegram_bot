// src/utils/delete.util.ts


import {RwBotContext} from "../scenes/context.interfaces";

/**
 * Отправляет сообщение пользователю, предварительно удаляя предыдущее сообщение бота.
 * @param ctx - Контекст Telegraf
 * @param text - Текст сообщения
 * @param extra - Дополнительные параметры (например, клавиатура)
 */
const replyAndCleanUp = async (ctx: RwBotContext, text: string, extra?: any) => {
    // 1. Пытаемся удалить предыдущее сообщение БОТА
    if (ctx.scene.session.toDeleteMsgId) {
        try {
            await ctx.deleteMessage(ctx.scene.session.toDeleteMsgId);
        } catch (e) { // @ts-ignore
            console.warn("Couldn't delete previous bot message", e.message); }
    }

    // 2. Пытаемся удалить предыдущее сообщение ПОЛЬЗОВАТЕЛЯ
    // if (ctx.scene.session.lastUserMessageId) {
    //     try {
    //         await ctx.deleteMessage(ctx.scene.session.lastUserMessageId);
    //     } catch (e) { // @ts-ignore
    //         console.warn("Couldn't delete previous user message", e.message); }
    //     // Очищаем, чтобы не пытаться удалить его снова
    //     delete ctx.scene.session.lastUserMessageId;
    // }

    // 3. Отправляем новое сообщение

    const newMessage = await ctx.reply(text, extra);
    // ctx.scene.session.toDelete/MsgId = newMessage.message_id
    // 4. Сохраняем ID нового сообщения бота в сессию
    if (extra) {
        console.log(`на следующем шаге будет удалено сообщение: ${text}`);
        ctx.scene.session.toDeleteMsgId = newMessage.message_id;
        console.log(`updated last message to ${newMessage.message_id}`);
    }
};

export default replyAndCleanUp;