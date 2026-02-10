import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check application health status' })
  getHealth() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get application information' })
  getInfo() {
    return {
      name: 'ClientPortal Pro API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
