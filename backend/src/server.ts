import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { defaultAiService, prismaAppointmentRepository, prismaChatRepository } from './app.js';
import { createChatSocketServer } from './chat.socket.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

const port = Number(process.env.PORT ?? 3000);
const httpServer = createServer(app);
createChatSocketServer(httpServer, prismaChatRepository, jwtSecret, prismaAppointmentRepository, defaultAiService);

httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
