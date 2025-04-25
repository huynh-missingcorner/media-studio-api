import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

import { GoogleCloudModule } from '../google-cloud/google-cloud.module';
import { VertexAiService } from './vertex-ai.service';
import { ImagenService } from './services/imagen.service';
import { VeoService } from './services/veo.service';
import { LyriaService } from './services/lyria.service';
import { ChirpService } from './services/chirp.service';

@Module({
  imports: [HttpModule, ConfigModule, GoogleCloudModule],
  providers: [
    ImagenService,
    VeoService,
    LyriaService,
    ChirpService,
    VertexAiService,
    {
      provide: Storage,
      useFactory: () => {
        return new Storage({
          projectId: process.env.VERTEX_AI_PROJECT_ID,
        });
      },
    },
  ],
  exports: [VertexAiService],
})
export class VertexAiModule {}
