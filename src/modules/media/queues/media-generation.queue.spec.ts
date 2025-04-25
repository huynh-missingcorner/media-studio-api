import { Test, TestingModule } from '@nestjs/testing';
import { BullModule as NestBullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { MEDIA_GENERATION_QUEUE } from './media-generation.queue';
import { getQueueToken } from '@nestjs/bull';

describe('MediaGenerationQueue', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        NestBullModule.registerQueue({
          name: MEDIA_GENERATION_QUEUE,
        }),
      ],
    }).compile();
  });

  it('should define media generation queue', () => {
    const queueToken = getQueueToken(MEDIA_GENERATION_QUEUE);
    const queue = module.get(queueToken);
    expect(queue).toBeDefined();
  });
});
