import { Module } from '@nestjs/common';
import { GoogleCloudService } from './google-cloud.service';
import { GoogleCloudFileService } from './google-cloud-file.service';

@Module({
  providers: [GoogleCloudService, GoogleCloudFileService],
  exports: [GoogleCloudService, GoogleCloudFileService],
})
export class GoogleCloudModule {}
