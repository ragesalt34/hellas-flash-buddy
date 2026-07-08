import 'dotenv/config';
import { startApiServer } from './api/server';

// Hellas Study — web-only backend. This process serves the REST API that the
// web app talks to; there is no Telegram bot anymore. Cloud hosts (Render)
// inject the port via PORT; locally we fall back to API_PORT (3001).
startApiServer(Number(process.env.PORT ?? process.env.API_PORT ?? 3001));
