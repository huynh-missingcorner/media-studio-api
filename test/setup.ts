import { PrismaTestService } from './prisma-test.service';

const prisma = new PrismaTestService();

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
