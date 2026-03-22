import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): { status: string; timestamp: string; service: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'miniwall-app',
    };
  }
}
