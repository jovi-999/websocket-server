import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { LoggerService } from 'src/logger/service';
import { SalaryNotificationController } from './controllers/salary-notification.controller';
import { InterviewNotificationController } from './controllers/interview-notification.controller';

@Module({
  providers: [NotificationGateway, NotificationService, LoggerService],
  controllers: [SalaryNotificationController, InterviewNotificationController],
  exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
