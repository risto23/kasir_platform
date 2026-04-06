import app from './app';
import { env } from './config/env';

console.log('[server.ts] starting server');

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`);
});