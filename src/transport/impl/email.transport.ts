import { INotificationTransport } from "../inotification.transport";

// Реализация для Email
class EmailTransport implements INotificationTransport {
    async send(message: string): Promise<boolean> {
        // ... логика отправки через SMTP ...
        return true;
    }
}