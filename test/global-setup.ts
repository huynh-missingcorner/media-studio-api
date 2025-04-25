import { execSync } from 'child_process';
import { Client } from 'pg';

const TEST_DB_URL = 'postgresql://testuser:testpass@localhost:5433/testdb?schema=public';

module.exports = async () => {
  process.env.DATABASE_URL = TEST_DB_URL;

  console.log('Starting test database...');
  execSync('docker-compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });

  console.log('Waiting for test database to be ready...');

  let retries = 10;
  while (retries) {
    try {
      const client = new Client({ connectionString: TEST_DB_URL });
      await client.connect();
      await client.end();
      break;
    } catch {
      retries -= 1;
      console.log('Database not ready, retrying...');
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
};
