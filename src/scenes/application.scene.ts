// src/scenes/application.scene.ts
import {Markup, Scenes} from 'telegraf';
import {RwBotContext} from "./context.interfaces";
import 'dotenv/config';
import replyAndCleanUp from "../utils/delete.util";
import { redisService } from '../bot';
import {
    cancelHandler,
    deleteApplicationHandler,
    createEditHandler,
    backToLastCompletedStepHandler
} from "../handlers/application.scene.handlers";
import { notificationService } from '../bot';

import {ACTION_MESSAGES, ACTION_NAMES} from "../constants";

const showConfirmation = async (ctx: RwBotContext) => {
    const data = ctx.scene.session.applicationState;

    const summary = `Проверьте данные:\n
Тип: ${data.projectType || 'Не указан'}
Площадь: ${data.area || 'Не указана'} м²
Местоположение: ${data.location || 'Не указано'}
Бюджет: ${data.budget || 'Не указан'} руб
Доп. Инфо: ${data.info || 'Не указано'}
Имя: ${data.name || 'Не указано'}
Контакты: ${data.phone || 'Не указан'}`;

    await ctx.reply(summary, Markup.inlineKeyboard([
        Markup.button.callback('✅ Отправить', ACTION_NAMES.SEND_FINAL),
        Markup.button.callback('✏️ Изменить', ACTION_NAMES.EDIT_FINAL),
    ]));
};

export const projectTypeButtons = Markup.inlineKeyboard([
    [Markup.button.callback('Индивидуальный жилой дом', 'type_house')],
    [Markup.button.callback('Интерьер', 'type_interior')],
    [Markup.button.callback('Хозпостройка', 'type_outbuilding')],
    [Markup.button.callback('Другое', 'type_other')],
])

export const askForProjectType = (ctx: RwBotContext) => {
    console.log('askForProjectType');
    return replyAndCleanUp(ctx,
        'Выберите тип проекта:',
        projectTypeButtons,
    );
};

export const askForCustomProjectType = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Пожалуйста, опишите ваш тип проекта:');
};

export const askForArea = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Введите площадь помещения/участка (в м²):');
};

export const askForLocation = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите местоположение объекта:');
};

export const askForBudget = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите бюджет проекта (в руб.):');
};

export const askForInfo = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Дополнительная информация, которую вы хотели бы предоставить до обсуждения проекта:');
};

export const askForName = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите ваше имя:');
};

export const askForContact = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите удобный вам способ связи (ТГ, ВК, телефон и пр.):');
};

export const restoreStep = async (ctx: RwBotContext, stepIndex: number) => {
    switch(stepIndex) {
        case 1:
            await askForProjectType(ctx);
            break;
        case 2:
            await askForCustomProjectType(ctx);
            break;
        case 3:
            await askForArea(ctx);
            break;
        case 4:
            await askForLocation(ctx);
            break;
        case 5:
            await askForBudget(ctx);
            break;
        case 6:
            await askForInfo(ctx);
            break;
        case 7:
            await askForName(ctx);
            break;
        case 8:
            await askForContact(ctx);
            break;
        default:
            await askForProjectType(ctx);
            return ctx.wizard.selectStep(1);
    }
    return ctx.wizard.selectStep(stepIndex);
}

export const applicationScene = new Scenes.WizardScene<RwBotContext>(
    'applicationScene',
    async (ctx) => {
        console.log('applicationScene')

        const lastStep = ctx.scene.session.lastCompletedStep;
        console.log(`last completed step: ${lastStep}`);
        if (typeof lastStep === 'number') {

            await ctx.reply(
                'Продолжаем заполнение...',
                Markup.keyboard([
                    ['Отмена']
                ]).resize()
            );

            await restoreStep(ctx, lastStep + 1);

        } else {
            console.log(`last completed NaN, new app: ${lastStep}`);
            ctx.scene.session.applicationState = {};
            ctx.scene.session.history = [];
            await ctx.reply(
                'Начинаем заполнение анкеты. В любой момент вы можете нажать "Отмена", чтобы прервать процесс.',
                Markup.keyboard([
                    ['Отмена']
                ]).resize()
            );
            try {
                await ctx.deleteMessage(ctx.scene.session.toDeleteMsgId);
            } catch (e) {
                console.error(e);
            }
            await askForProjectType(ctx);
            return ctx.wizard.next();
        }
        },

    async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {

            try {
                await ctx.deleteMessage(ctx.scene.session.toDeleteMsgId);
            } catch (e) {
                console.error(e);
            }

            const msg = await ctx.reply('Пожалуйста, выберите один из вариантов с помощью кнопок.',
                projectTypeButtons,
            );
            ctx.scene.session.toDeleteMsgId = msg.message_id;
            return msg;
        }
        await ctx.answerCbQuery();
        const projectType = ctx.callbackQuery.data;

        // ctx.scene.session.history.push(0);
        ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

        if (projectType === 'type_other') {
            await askForCustomProjectType(ctx);
            return ctx.wizard.next();
        }

        const button = (ctx.callbackQuery.message as any).reply_markup.inline_keyboard
            .flat()
            .find((b: { callback_data: string; }) => b.callback_data === projectType);

        if (button) {
            ctx.scene.session.applicationState.projectType = button.text;
        }

        if (ctx.scene.session.isEditing) {
            delete ctx.scene.session.isEditing;
            await showConfirmation(ctx);
            return ctx.wizard.selectStep(8);
        }

        await askForArea(ctx);
        return ctx.wizard.selectStep(3);
        },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            ctx.scene.session.applicationState.projectType = `Другое: ${ctx.message.text}`;
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForArea(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            const area = parseInt(ctx.message.text, 10);
            if (isNaN(area) || area <= 0) {
                await ctx.reply('Пожалуйста, введите корректное число (например, 120).');
                return;
            }
            ctx.scene.session.applicationState.area = area;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForLocation(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            ctx.scene.session.applicationState.location = ctx.message.text;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForBudget(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            const budget = parseInt(ctx.message.text, 10);
            if (isNaN(budget) || budget <= 0) {
                await ctx.reply('Пожалуйста, введите корректное число в руб. (например, 120000).');
                return;
            }
            ctx.scene.session.applicationState.budget = budget;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForInfo(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.applicationState.info = ctx.message.text;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForName(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            ctx.scene.session.applicationState.name = ctx.message.text;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await askForContact(ctx);
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {

            ctx.scene.session.applicationState.user = `${ctx.message.from.id}`;
            ctx.scene.session.applicationState.phone = ctx.message.text;
            // ctx.scene.session.history.push(ctx.wizard.cursor);
            ctx.scene.session.lastCompletedStep = ctx.wizard.cursor;

            await showConfirmation(ctx);
        }
    },
);

applicationScene.action(ACTION_NAMES.SEND_FINAL, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined); // Убираем кнопки
    await ctx.reply('Спасибо! Мы свяжемся с вами в ближайшее время.',
        Markup.keyboard([
            [('Новая заявка')]
        ]).resize()
    );
    const data = ctx.scene.session.applicationState;

    const user = ctx.from;
    let userMention: string;

    if (user.username) {
        userMention = `@${user.username}`;
    } else {
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        userMention = `[${fullName || 'Пользователь'}](tg://user?id=${user.id})`;
    }
    try {
        await notificationService.sendApplication(data, userMention);
    } catch (error) {
        // @ts-ignore
        console.error('FAILED TO PROCEED APPLICATION TO NOTIFICATION SERVICE, MANUALLY ADDED TO REDIS:', error.message);
        await redisService.addFailedApplicationToQueue(data);
    }

    console.log(ctx.scene.session.applicationState);

    ctx.scene.session.applicationState = {};
    ctx.scene.session.history = [];
    delete ctx.scene.session.lastCompletedStep;

    return ctx.scene.leave();
});

// "Изменить"
applicationScene.action(ACTION_NAMES.EDIT_FINAL, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const editMsg = await ctx.reply('Выберите поле, которое хотите изменить:', Markup.inlineKeyboard([
        [Markup.button.callback('Тип проекта', ACTION_NAMES.EDIT_PROJ_TYPE)],
        [Markup.button.callback('Площадь', ACTION_NAMES.EDIT_AREA)],
        [Markup.button.callback('Местоположение', ACTION_NAMES.EDIT_LOCATION)],
        [Markup.button.callback('Бюджет', ACTION_NAMES.EDIT_BUDGET)],
        [Markup.button.callback('Доп. инфо', ACTION_NAMES.EDIT_INFO)],
        [Markup.button.callback('Имя', ACTION_NAMES.EDIT_NAME), Markup.button.callback('Контакты', 'edit_phone')],
    ]));
    ctx.scene.session.toDeleteMsgId = editMsg.message_id;
});

applicationScene.action(ACTION_NAMES.EDIT_PROJ_TYPE, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    ctx.scene.session.isEditing = true;
    await askForProjectType(ctx);

    return ctx.wizard.selectStep(1);
});
applicationScene.action(ACTION_NAMES.EDIT_AREA, createEditHandler(ACTION_MESSAGES.ASK_AREA, 3));
applicationScene.action(ACTION_NAMES.EDIT_LOCATION, createEditHandler(ACTION_MESSAGES.ASK_LOCATION, 4));
applicationScene.action(ACTION_NAMES.EDIT_BUDGET, createEditHandler(ACTION_MESSAGES.ASK_BUDGET, 5));
applicationScene.action(ACTION_NAMES.EDIT_INFO, createEditHandler(ACTION_MESSAGES.ASK_INFO, 6));
applicationScene.action(ACTION_NAMES.EDIT_NAME, createEditHandler(ACTION_MESSAGES.ASK_NAME, 7));
applicationScene.action(ACTION_NAMES.EDIT_PHONE, createEditHandler(ACTION_MESSAGES.ASK_CONTACT, 8));
applicationScene.action(ACTION_NAMES.DELETE_CURRENT_APP, deleteApplicationHandler(ACTION_MESSAGES.DELETE_APP_SUCCESS));
applicationScene.action(ACTION_NAMES.BACK_TO_APP, backToLastCompletedStepHandler(ACTION_MESSAGES.BACK_TO_APP));
applicationScene.hears('Отмена', cancelHandler(ACTION_MESSAGES.ASK_CANCEL));