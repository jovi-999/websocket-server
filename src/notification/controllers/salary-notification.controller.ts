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
import { SendSalaryNotificationDto } from '../dto/salary-notification.dto';
import { NotificationGateway } from '../notification.gateway';
import { NotificationService } from '../notification.service';

@Controller('api/salary/notifications')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: false,
    stopAtFirstError: false,
  }),
)
export class SalaryNotificationController {
  private readonly logger = new Logger(SalaryNotificationController.name);

  constructor(
    private readonly notificationsGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  sendNotification(@Body() notificationDto: SendSalaryNotificationDto) {
    this.logger.log(
      `☀️☀️☀️ salary controller 收到通知請求: ${JSON.stringify(notificationDto)}`,
    );

    try {
      this.notificationService.validateNotificationLogic(notificationDto);

      if (notificationDto.to === 'all') {
        this.notificationsGateway.sendNotificationToAllClients(notificationDto);
        return {
          success: true,
          message: '通知已成功推送給[salary站的所有客戶端]。',
          site: 'salary',
          timestamp: new Date().toISOString(),
        };
      } else {
        const isUserOnline =
          this.notificationsGateway.sendNotificationToSpecificUser(
            notificationDto.to,
            notificationDto.site,
            notificationDto.data,
          );

        return {
          success: true,
          message: `通知已成功推送給salary站的指定用戶 [${notificationDto.to}]。`,
          site: 'salary',
          userOnline: isUserOnline,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(`salary站通知發送失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}
