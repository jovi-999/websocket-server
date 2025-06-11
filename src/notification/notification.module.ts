import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationGateway, NotificationService], // 註冊 Gateway, Service
  controllers: [NotificationController], // 註冊 Controller
})
export class NotificationModule {}
