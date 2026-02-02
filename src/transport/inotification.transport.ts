// Интерфейс для любого способа отправки
interface INotificationTransport {
    send(message: string): Promise<boolean>;
}