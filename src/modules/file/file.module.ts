import { Module } from '@nestjs/common';
import { GoogleCloudModule } from '../../shared/infrastructure/google-cloud/google-cloud.module';
import { FileService } from './file.service';
import { FileController } from './file.controller';

@Module({
  imports: [GoogleCloudModule],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
