import { Module } from '@nestjs/common';
import { GoogleCloudModule } from './google-cloud/google-cloud.module';
import { PrismaModule } from './prisma/prisma.module';
import { VertexAiModule } from './vertex-ai/vertex-ai.module';
import { SeedModule } from './seed/seed.module';
import { BullModule } from '../infrastructure/bull/bull.module';

@Module({
  imports: [PrismaModule, GoogleCloudModule, VertexAiModule, SeedModule, BullModule],
  exports: [PrismaModule, GoogleCloudModule, VertexAiModule, SeedModule, BullModule],
})
export class InfrastructureModule {}
