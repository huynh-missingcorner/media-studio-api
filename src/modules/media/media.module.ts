import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { VertexAiModule } from '../../shared/infrastructure/vertex-ai/vertex-ai.module';
import { GoogleCloudModule } from '../../shared/infrastructure/google-cloud/google-cloud.module';
import { MEDIA_GENERATION_QUEUE } from './queues/media-generation.queue';
import { MediaGenerationProcessor } from './processors/media-generation.processor';

@Module({
  imports: [
    PrismaModule,
    VertexAiModule,
    GoogleCloudModule,
    BullModule.registerQueue({
      name: MEDIA_GENERATION_QUEUE,
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaGenerationProcessor],
  exports: [MediaService],
})
export class MediaModule {}
