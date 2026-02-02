// src/services/redis.service.ts
import { RedisClientType } from 'redis';
import { ApplicationData } from '../scenes/context.interfaces';

const FAILED_APPLICATIONS_QUEUE = 'queue:failed_applications';

export class RedisService {
    constructor(private readonly redisClient: RedisClientType) {}

    /**
     * Добавляет неотправленную заявку в очередь на повторную отправку.
     * @param applicationData - Данные заявки.
     */
    public async addFailedApplicationToQueue(applicationData: ApplicationData): Promise<void> {
        try {
            // Превращаем объект заявки в строку JSON для хранения в Redis
            const applicationJson = JSON.stringify(applicationData);

            await this.redisClient.lPush(FAILED_APPLICATIONS_QUEUE, applicationJson);
            console.log('Application added to the retry queue.');
        } catch (error) {
            console.error('Failed to add application to Redis queue:', error);
        }
    }

    /**
     * Извлекает самую старую заявку из очереди.
     * @returns Данные заявки или null, если очередь пуста.
     */
    public async getOldestFailedApplication(): Promise<ApplicationData | null> {
        try {
            const applicationJson = await this.redisClient.rPop(FAILED_APPLICATIONS_QUEUE);
            if (!applicationJson) {
                return null; // Очередь пуста
            }

            return JSON.parse(applicationJson) as ApplicationData;
        } catch (error) {
            console.error('Failed to get application from Redis queue:', error);
            return null;
        }
    }


    public async addApplicationToQueue(applicationData: ApplicationData): Promise<void> {
        try {
            // Превращаем объект заявки в строку JSON для хранения в Redis
            const applicationJson = JSON.stringify(applicationData);

            await this.redisClient.lPush(FAILED_APPLICATIONS_QUEUE, applicationJson);
            console.log('Application added to the retry queue.');
        } catch (error) {
            console.error('Failed to add application to Redis queue:', error);
        }
    }
}
export default RedisService;