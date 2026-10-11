import { createServer } from 'node:http';
import { createApp } from './app';
import { connectDb } from './config/db';
import { loadEnv } from './config/env';

async function main() {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI);

  const app = createApp({ clientUrl: env.CLIENT_URL });
  // socket.io will use this server for chat later
  const server = createServer(app);

  server.listen(env.PORT, () => {
    console.log(`Karigor API running on http://localhost:${env.PORT}/api/v1`);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
