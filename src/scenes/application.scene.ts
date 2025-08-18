// src/scenes/application.scene.ts
import {Markup, Scenes} from 'telegraf';
import {RwBotContext} from "./context.interfaces";
import 'dotenv/config';
import replyAndCleanUp from "../utils/delete.util";

const showConfirmation = async (ctx: RwBotContext) => {
    const data = ctx.scene.session.applicationState;

    const summary = `Проверьте данные:\n
Тип: ${data.projectType || 'Не указан'}
Площадь: ${data.area || 'Не указана'} м²
Местоположение: ${data.location || 'Не указано'}
Бюджет: ${data.budget || 'Не указан'} руб
Доп. Инфо: ${data.info || 'Не указано'}
Имя: ${data.name || 'Не указано'}
Телефон: ${data.phone || 'Не указан'}`;

    await ctx.reply(summary, Markup.inlineKeyboard([
        Markup.button.callback('✅ Отправить', 'send_final'),
        Markup.button.callback('✏️ Изменить', 'edit_final')
    ]));
};

const askForProjectType = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx,
        'Выберите тип проекта:',
        Markup.inlineKeyboard([
            [Markup.button.callback('Индивидуальный жилой дом', 'type_house')],
            [Markup.button.callback('Интерьер', 'type_interior')],
            [Markup.button.callback('Хозпостройка', 'type_outbuilding')],
            [Markup.button.callback('Другое', 'type_other')],
        ])
    );
};

const askForCustomProjectType = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Пожалуйста, опишите ваш тип проекта:');
};

const askForArea = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Введите площадь помещения/участка (в м²):');
};

const askForLocation = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите местоположение объекта:');
};

const askForBudget = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите бюджет проекта (в руб.):');
};

const askForInfo = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Дополнительная информация, которую вы хотели бы предоставить до обсуждения проекта:');
};

const askForName = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите ваше имя:');
};

const askForContact = (ctx: RwBotContext) => {
    return replyAndCleanUp(ctx, 'Укажите удобный вам способ связи (ТГ, ВК, телефон и пр.):');
};

export const applicationScene = new Scenes.WizardScene<RwBotContext>(
    'applicationScene',

    async (ctx) => {
        ctx.scene.session.applicationState = {};
        ctx.scene.session.history = [];
        try {
            await ctx.deleteMessage(ctx.scene.session.toDeleteMsgId);
        } catch (e) {
            console.error(e);
        }
        await askForProjectType(ctx);
        return ctx.wizard.next();
        },

    async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
            await ctx.reply('Пожалуйста, выберите один из вариантов с помощью кнопок.');
            return;
        }
        await ctx.answerCbQuery();
        const projectType = ctx.callbackQuery.data;

        ctx.scene.session.history.push(0);

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
            ctx.scene.session.history.push(ctx.wizard.cursor);

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
            ctx.scene.session.history.push(ctx.wizard.cursor);

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
            ctx.scene.session.history.push(ctx.wizard.cursor);

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
            ctx.scene.session.history.push(ctx.wizard.cursor);

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
            ctx.scene.session.history.push(ctx.wizard.cursor);

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
        // обработки поля (телефона)
        // и первого вызова сводки.
        if (ctx.message && 'text' in ctx.message) {

            ctx.scene.session.applicationState.user = `${ctx.message.from.id}`;
            // TODO: Добавить валидацию телефона
            ctx.scene.session.applicationState.phone = ctx.message.text;
            ctx.scene.session.history.push(ctx.wizard.cursor);

            await showConfirmation(ctx);
            // await ctx.reply('...', Markup.removeKeyboard());
        }
    },
);

applicationScene.action('send_final', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined); // Убираем кнопки
    await ctx.reply('Спасибо! Мы свяжемся с вами в ближайшее время.', Markup.removeKeyboard());
    // todo БД

    const data = ctx.scene.session.applicationState;

    const user = ctx.from;
    let userMention: string;

    if (user.username) {
        // Если есть username, используем его
        userMention = `@${user.username}`;
    } else {
        // Если нет, используем имя и фамилию.
        // А еще лучше - создаем кликабельную ссылку на профиль!
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        // Ссылка вида tg://user?id=123456789 откроет чат с пользователем по клику
        userMention = `[${fullName || 'Пользователь'}](tg://user?id=${user.id})`;
    }

    // @ts-ignore
    const summary = `Новая заявка.\n
От пользователя: ${userMention}
    
Тип: ${data.projectType || 'Не указан'}
Площадь: ${data.area || 'Не указана'} м²
Местоположение: ${data.location || 'Не указано'}
Бюджет: ${data.budget || 'Не указан'} руб
Доп. Инфо: ${data.info || 'Не указано'}
Имя: ${data.name || 'Не указано'}
Контакт: ${data.phone || 'Не указан'}`;

    // @ts-ignore
    ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID.toString(), summary);
    console.log(ctx.scene.session.applicationState);
    return ctx.scene.leave();
});


// "Изменить"
applicationScene.action('edit_final', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const editMsg = await ctx.reply('Выберите поле, которое хотите изменить:', Markup.inlineKeyboard([
        [Markup.button.callback('Тип проекта', 'edit_projectType')],
        [Markup.button.callback('Площадь', 'edit_area')],
        [Markup.button.callback('Местоположение', 'edit_location')],
        [Markup.button.callback('Бюджет', 'edit_budget')],
        [Markup.button.callback('Доп. инфо', 'edit_info')],
        [Markup.button.callback('Имя', 'edit_name'), Markup.button.callback('Контакты', 'edit_phone')],
    ]));
    ctx.scene.session.toDeleteMsgId = editMsg.message_id;
});

// Обработчики для каждого поля
const createEditHandler = (replyText: string, stepIndex: number) => async (ctx: RwBotContext) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    ctx.scene.session.isEditing = true;
    console.log('isEditing is true');
    await ctx.reply(replyText);
    return ctx.wizard.selectStep(stepIndex);
};
//todo fix strange behaviour
//
// applicationScene.hears('⬅️ Назад', async (ctx) => {
//
//     if (!ctx.scene.session.history || ctx.scene.session.history.length === 0) {
//         await ctx.reply('Вы в самом начале, возвращаться некуда.');
//         return;
//     }
//
//     const currentStepIndex = ctx.wizard.cursor;
//
//     switch(currentStepIndex) {
//         case 4: // Уходим с шага "Локация"
//             delete ctx.scene.session.applicationState.location;
//             break;
//         case 5: // Уходим с шага "Бюджет"
//             delete ctx.scene.session.applicationState.budget;
//             break;
//         case 6:
//             delete ctx.scene.session.applicationState.info;
//             break;
//         case 7:
//             delete ctx.scene.session.applicationState.name;
//             break;
//         case 8: // Шаг телефона
//             delete ctx.scene.session.applicationState.phone;
//             break;
//
//     }
//
//     // Достаем из стека индекс предыдущего шага
//     const previousStepIndex = ctx.scene.session.history.pop()!;
//     await ctx.reply('Хорошо, вернемся на шаг назад.');
//
//     // Перемещаем курсор
//     ctx.wizard.selectStep(previousStepIndex);
//
//     switch(previousStepIndex) {
//         case 0:
//             delete ctx.scene.session.applicationState.projectType;
//             break;
//         case 2:
//             delete ctx.scene.session.applicationState.projectType;
//             break;
//         case 3:
//             delete ctx.scene.session.applicationState.area;
//             break;
//         case 4:
//             delete ctx.scene.session.applicationState.location;
//             break;
//         case 5:
//             delete ctx.scene.session.applicationState.budget;
//             break;
//         case 6:
//             delete ctx.scene.session.applicationState.info;
//             break;
//         case 7:
//             delete ctx.scene.session.applicationState.name;
//             break;
//     }
//
//     switch(previousStepIndex) {
//         case 0:
//             await askForProjectType(ctx);
//             break;
//         case 2:
//             await askForCustomProjectType(ctx);
//             break;
//         case 3:
//             await askForArea(ctx);
//             break;
//         case 4:
//             await askForLocation(ctx);
//             break;
//         case 5:
//             await askForBudget(ctx);
//             break;
//         case 6:
//             await askForInfo(ctx);
//             break;
//         case 7:
//             await askForName(ctx);
//             break;
//     }
//
// });

applicationScene.action('edit_projectType', createEditHandler('Выберите тип проекта:', 0));
applicationScene.action('edit_area', createEditHandler('Введите площадь помещения/участка (в м²):', 3));
applicationScene.action('edit_location', createEditHandler('Укажите местоположение объекта:', 4));
applicationScene.action('edit_budget', createEditHandler('Укажите бюджет (в руб.):', 5));
applicationScene.action('edit_info', createEditHandler('Укажите дополнительную информацию:', 6));
applicationScene.action('edit_name', createEditHandler('Укажите ваше имя:', 7));
applicationScene.action('edit_phone', createEditHandler('Укажите ваш номер телефона:', 8));