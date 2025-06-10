import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';

@Module({
  providers: [NotificationGateway], // 註冊 Gateway
  controllers: [NotificationController], // 註冊 Controller
})
export class NotificationModule {}
