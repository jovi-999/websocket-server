import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SendNotificationDto } from './dto/notification.dto';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Controller('api/notifications')
@UsePipes(
  new ValidationPipe({
    transform: true, // 啟用自動轉換 DTO
    whitelist: true, // 過濾多餘屬性
    forbidNonWhitelisted: true, // 拒絕多餘屬性
    disableErrorMessages: false, // 確保顯示錯誤訊息
    stopAtFirstError: false, // 顯示所有驗證錯誤
  }),
)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationsGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 'to' 欄位來決定是全體廣播還是私訊單一使用者。
   */
  @Post('send') // 統一的路由 -> /api/notifications/send
  @HttpCode(HttpStatus.OK)
  sendNotification(@Body() notificationDto: SendNotificationDto) {
    this.logger.log(
      `☀️☀️☀️ controller 收到通知請求: ${JSON.stringify(notificationDto)}`,
    );

    try {
      // 執行API內容驗證
      this.notificationService.validateNotificationLogic(notificationDto);

      if (notificationDto.to === 'all') {
        // 廣播給所有人
        this.notificationsGateway.sendNotificationToAllClients(notificationDto);
        return {
          success: true,
          message: '通知已成功推送給[所有客戶端]。',
          timestamp: new Date().toISOString(),
        };
      } else {
        // 發送給特定使用者
        const isUserOnline =
          this.notificationsGateway.sendNotificationToSpecificUser(
            notificationDto.to,
            notificationDto.site,
            notificationDto.data,
          );

        return {
          success: true,
          message: `通知已成功推送給指定用戶 [${notificationDto.to}]。`,
          userOnline: isUserOnline,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(`通知發送失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}
