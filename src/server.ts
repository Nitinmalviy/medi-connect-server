import app from './app';
import { env } from './config/env';
import { connectDB } from './config/database';

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
