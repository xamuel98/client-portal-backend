import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectApprovalListener } from './listeners/project-approval.listener';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    TenantsModule, // For TenantGuard
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, ProjectApprovalListener],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
