import { Bot } from 'grammy';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN must be set');

export const bot = new Bot(token);
