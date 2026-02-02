// Интерфейс для любого способа отправки
export interface INotificationTransport {
    send(message: string): Promise<boolean>;
}