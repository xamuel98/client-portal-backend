import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskApprovalListener } from './listeners/task-approval.listener';
import { TenantsModule } from '../tenants/tenants.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    TenantsModule,
    IntegrationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TaskApprovalListener],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
