import { Telegraf } from "telegraf";
import { RwBotContext } from "../../scenes/context.interfaces";



// Реализация для тг-бота
export class TelegramTransport implements INotificationTransport {
    constructor(private bot: Telegraf<RwBotContext>, private adminIds: string[]) {}

    async send(message: string): Promise<boolean> {
        let success = true;

        try {
            await Promise.all(adminIds.map(id =>
                this.bot.telegram.sendMessage(id!, message, { parse_mode: 'Markdown' })
            ));

            console.log('Application sent successfully to admins.');
            return true;

        } catch (error) {
            console.error('FAILED TO SEND APPLICATION TO ADMIN:', error);
            success = false;
        }

        return false;
    }
}