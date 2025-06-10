import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

// DTO 規範請求的 body 結構
export class SendNotificationDto {
  // 根據你的通知內容定義屬性，例如：
  message: string;
  count?: number; // 未讀數量 (可選)
  userId?: string | number; // 特定用戶 ID (如果需要針對特定用戶)
  data?: any; // 其他附加資料
}

@Controller('api/notifications') // API 路由前綴
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationsGateway: NotificationGateway) {}

  @Post('send-to-all') // 完整路徑為 /api/notifications/send-to-all
  @HttpCode(HttpStatus.OK)
  sendNotificationToAll(@Body() notificationDto: SendNotificationDto) {
    this.logger.log(
      `收到 Laravel 後端請求，準備發送通知: ${JSON.stringify(notificationDto)}`,
    );
    this.notificationsGateway.sendNotificationToAllClients(notificationDto);
    return { success: true, message: '通知已成功推送給所有客戶端。' };
  }
}
