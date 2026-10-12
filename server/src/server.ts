import { createServer } from 'node:http';
import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function main() {
  await connectDb(env.MONGODB_URI);

  // socket.io will use this server for chat later
  const server = createServer(createApp());

  server.listen(env.PORT, () => {
    console.log(`Karigor API running on http://localhost:${env.PORT}/api/v1`);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
