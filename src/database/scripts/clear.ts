import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Logger } from '@nestjs/common';

async function clear() {
  const logger = new Logger('ClearDB');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const connection = app.get<Connection>(getConnectionToken());

    // Safety check: Don't clear if production, although environment variables should handle this
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Cannot clear database in production environment');
      return;
    }

    logger.log(`Clearing database: ${connection.name}`);
    await connection.dropDatabase();
    logger.log('Database cleared successfully');
  } catch (error) {
    logger.error('Failed to clear database', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

clear();
