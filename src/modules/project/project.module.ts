import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { InfrastructureModule } from '../../shared/infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
