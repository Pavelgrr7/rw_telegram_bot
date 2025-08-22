// src/handlers/application.scene.handlers.ts

import {RwBotContext} from "../scenes/context.interfaces";
import {Markup} from "telegraf";
import {
    askForArea,
    askForBudget, askForContact,
    askForCustomProjectType, askForInfo,
    askForLocation, askForName,
    askForProjectType, restoreStep
} from "../scenes/application.scene";
import {ACTION_NAMES} from "../constants";

export const createEditHandler = (replyText: string, stepIndex: number) => async (ctx: RwBotContext) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    ctx.scene.session.isEditing = true;
    console.log('isEditing is true');
    await ctx.reply(replyText);
    return ctx.wizard.selectStep(stepIndex);
};

export const cancelHandler = (replyText: string) => async (ctx: RwBotContext) => {
    await ctx.reply(replyText, Markup.inlineKeyboard([
            Markup.button.callback('Удалить заявку', 'delete_curr_app'),
            Markup.button.callback('Вернуться к заполнению', 'back_to_app')
        ])
    );
    console.log('cancel');
}

export const deleteApplicationHandler = (replyText: string) => async (ctx: RwBotContext) => {
    await ctx.answerCbQuery();
    await ctx.reply(replyText, Markup.keyboard([
        ['Новая заявка']
    ]).resize());
    //todo: delete current application

    await ctx.scene.leave();
}

export const backToLastCompletedStepHandler = (replyText: string) => async (ctx: RwBotContext) => {
    await ctx.answerCbQuery();

    await ctx.deleteMessage();

    await ctx.reply(replyText);

    // последний вопрос
    const lastStep = ctx.scene.session.lastCompletedStep;

    const currentStep = (typeof lastStep === 'number') ? lastStep + 1 : 1;
    await restoreStep(ctx, currentStep);

};