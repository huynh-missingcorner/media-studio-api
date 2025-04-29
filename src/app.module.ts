import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { MediaModule } from './modules/media/media.module';
import { FileModule } from './modules/file/file.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    AuthModule,
    UserModule,
    ProjectModule,
    MediaModule,
    FileModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
