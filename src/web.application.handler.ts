import express from 'express';
import { notificationService } from './bot';

export const startWebServer = () => {

    const app = express();
    const PORT = (process.env.HTTP_PORT) || '3000';
    const HOST = '0.0.0.0';

    app.use(express.json());

    // http://localhost:3001/applications
    app.post('/applications', async (req, res) => {
        console.log('Received new application (HTTP)...');

        try {
            const applicationData = req.body;

            await notificationService.sendApplication(applicationData);

            console.log('Application from HTTP successfully added to notification service.');

            return res.status(201).json({ message: 'Application accepted and queued for processing.' });

        } catch (error) {
            console.error('Error processing HTTP application:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });

    app.listen(parseInt(PORT), HOST, () => {
        console.log(`HTTP server is listening on http://${HOST}:${PORT}`);
    });
}