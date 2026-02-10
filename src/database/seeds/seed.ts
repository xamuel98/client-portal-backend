import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { ProjectsService } from '../../modules/projects/projects.service';
import { InvoicesService } from '../../modules/invoices/invoices.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { TenantsService } from '../../modules/tenants/tenants.service';
import { TasksService } from '../../modules/tasks/tasks.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seeder');
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const projectsService = app.get(ProjectsService);
  const invoicesService = app.get(InvoicesService);
  const usersService = app.get(UsersService);
  const tenantsService = app.get(TenantsService);

  try {
    logger.log('Starting seed...');

    const email = 'owner@acme.com';
    const password = 'Password123!';
    let user = await usersService.findByEmail(email);

    if (!user) {
      await authService.register({
        tenantName: 'Acme Digital',
        email,
        password,
        firstName: 'System',
        lastName: 'Owner',
        phone: '+1234567890',
      });
      user = await usersService.findByEmail(email);
    }

    if (!user) {
      throw new Error('Seed failed: Owner user not found');
    }

    await authService.login({ email, password });
    const tenantId = user.tenantId.toString();

    // Update tenant with specific locale/currency for testing
    await tenantsService.update(tenantId, {
      settings: {
        currency: 'NGN',
        locale: 'en-NG',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        invoicePrefix: 'ACME-',
        features: {
          whiteLabeling: true,
          customDomain: false,
          apiAccess: true,
          advancedAnalytics: true,
        },
      },
    });

    logger.log(`Updated Tenant Settings: NGN/en-NG`);

    logger.log(
      `Created Tenant and Owner: owner@acme.com (Tenant: ${tenantId})`,
    );

    // 2. Create Projects
    const projectName = 'SaaS Platform Development';
    const projects = await projectsService.findAll(tenantId, {});
    let project = projects.data.find((p) => p.name === projectName);

    if (!project) {
      project = await projectsService.create(
        {
          name: projectName,
          description: 'Building the next gen SaaS platform',
        },
        tenantId,
      );
      logger.log(`Created Project: ${project.name}`);
    } else {
      logger.log(`Project already exists: ${projectName}`);
    }

    // 3. Create Invoices
    const invoiceNumber = `INV-SEED-${Date.now().toString().slice(-4)}`;
    const invoice = await invoicesService.create(
      {
        clientId: user._id.toString(),
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          { description: 'Phase 1 - Planning', quantity: 1, unitPrice: 150000 },
          { description: 'Frontend Work', quantity: 20, unitPrice: 5000 },
        ],
        currency: 'NGN',
      },
      tenantId,
    );
    logger.log(
      `Created Invoice: ${invoice.invoiceNumber} (Currency: ${invoice.currency})`,
    );

    logger.log('Seed completed successfully!');
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();
