import { Telegraf } from 'telegraf';
import { RwBotContext, ApplicationData } from '../scenes/context.interfaces';
import { RedisService } from './redis.service';
import { INotificationTransport } from '../transport/notification.transport.interface';
export class NotificationService {
    constructor(
        private transport: INotificationTransport,
        private readonly redisService: RedisService
    ) {}

    /**
     * Формирует текст заявки и пытается отправить её админам.
     * В случае неудачи сохраняет в очередь redis.
     */
    async sendApplication(data: ApplicationData, userMention?: string) {
        console.log(`NotificationService: received app: ${data}`)

        const message = this.formatMessage(data, userMention || 'Заявка с сайта');
        
        const success = await this.transport.send(message); // Не важно, какой класс реализует transport

        // Хотя бы одна ошибка -> заявка в Redis
        if (!success) {
            await this.redisService.addFailedApplicationToQueue(data);
        }
    }
    
    private formatMessage(data: ApplicationData, userMention: string): string {
        return `Новая заявка.\n
От пользователя: ${userMention}
    
Тип: ${data.projectType || 'Не указан'}
Площадь: ${data.area || 'Не указана'} м²
Местоположение: ${data.location || 'Не указано'}
Бюджет: ${data.budget || 'Не указан'} руб
Доп. Инфо: ${data.info || 'Не указано'}
Имя: ${data.name || 'Не указано'}
Контакт: ${data.phone || 'Не указан'}`;
    }
}