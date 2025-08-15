// src/scenes/application.scene.ts
import {Markup, Scenes} from 'telegraf';
import {RwBotContext} from "./context.interfaces";
import 'dotenv/config';


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

export const applicationScene = new Scenes.WizardScene<RwBotContext>(
    'applicationScene',
    async (ctx) => {
        ctx.scene.session.applicationState = {};

        await ctx.reply(
            'Выберите тип проекта:',
            Markup.inlineKeyboard([
                [Markup.button.callback('Индивидуальный жилой дом', 'type_house')],
                [Markup.button.callback('Интерьер', 'type_interior')],
                [Markup.button.callback('Хозпостройка', 'type_outbuilding')],
                [Markup.button.callback('Другое', 'type_other')],
            ])
        );
        return ctx.wizard.next();
    },

    async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
            await ctx.reply('Пожалуйста, выберите один из вариантов с помощью кнопок.');
            return;
        }
        await ctx.answerCbQuery();
        const projectType = ctx.callbackQuery.data;

        let shouldAskForArea = true;

        if (projectType === 'type_other') {
            await ctx.reply('Пожалуйста, опишите ваш тип проекта:');
            shouldAskForArea = false;
            ctx.wizard.next();
        }

        // Ищем текст на кнопке, которую нажал пользователь
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

        if (shouldAskForArea) {
            await ctx.reply('Введите площадь помещения/участка (в м²):');
            return ctx.wizard.selectStep(3); // Прыгаем через шаг "Другое"
        }

        // return ctx.wizard.selectStep(ctx.wizard.cursor + 2);
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.applicationState.projectType = `Другое: ${ctx.message.text}`;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await ctx.reply('Отлично! Теперь введите площадь помещения/участка (в м²):');
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

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await ctx.reply('Укажите местоположение объекта:');
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.applicationState.location = ctx.message.text;

            if (ctx.scene.session.isEditing) {
                delete ctx.scene.session.isEditing;
                await showConfirmation(ctx);
                return ctx.wizard.selectStep(8);
            }

            await ctx.reply('Укажите бюджет проекта (в руб.):');
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
            await ctx.reply('Дополнительная информация, которую вы хотели бы предоставить до обсуждения проекта:');
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.applicationState.info = ctx.message.text;
            await ctx.reply('Укажите ваше имя:');
            return ctx.wizard.next();
        }
    },

    async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            ctx.scene.session.applicationState.name = ctx.message.text;
            await ctx.reply('Укажите удобный вам способ связи (ТГ, ВК, телефон и пр.):');
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
            await showConfirmation(ctx);
        }
    },
);

applicationScene.action('send_final', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined); // Убираем кнопки
    await ctx.reply('Спасибо! Мы свяжемся с вами в ближайшее время.');
    // todo БД

    const data = ctx.scene.session.applicationState;
    // @ts-ignore
    const summary = `Новая заявка.\n
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

    await ctx.reply('Выберите поле, которое хотите изменить:', Markup.inlineKeyboard([
        [Markup.button.callback('Тип проекта', 'edit_projectType')],
        [Markup.button.callback('Площадь', 'edit_area')],
        [Markup.button.callback('Местоположение', 'edit_location')],
        [Markup.button.callback('Бюджет', 'edit_budget')],
        [Markup.button.callback('Доп. инфо', 'edit_info')],
        [Markup.button.callback('Имя', 'edit_name'), Markup.button.callback('Контакты', 'edit_phone')],
    ]));
});

// Обработчики для каждого поля
const createEditHandler = (replyText: string, stepIndex: number) => async (ctx: RwBotContext) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    ctx.scene.session.isEditing = true;
    await ctx.reply(replyText);
    return ctx.wizard.selectStep(stepIndex);
};

applicationScene.action('edit_projectType', createEditHandler('Выберите тип проекта:', 0));
applicationScene.action('edit_area', createEditHandler('Введите площадь помещения/участка (в м²):', 3));
applicationScene.action('edit_location', createEditHandler('Укажите местоположение объекта:', 4));
applicationScene.action('edit_budget', createEditHandler('Укажите бюджет (в руб.):', 5));
applicationScene.action('edit_info', createEditHandler('Укажите дополнительную информацию:', 6));
applicationScene.action('edit_name', createEditHandler('Укажите ваше имя:', 7));
applicationScene.action('edit_phone', createEditHandler('Укажите ваш номер телефона:', 8));