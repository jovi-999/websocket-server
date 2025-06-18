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
import { SendInterviewNotificationDto } from '../dto/interview-notification.dto';
import { NotificationGateway } from '../notification.gateway';
import { NotificationService } from '../notification.service';

@Controller('api/interview/notifications')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: false,
    stopAtFirstError: false,
  }),
)
export class InterviewNotificationController {
  private readonly logger = new Logger(InterviewNotificationController.name);

  constructor(
    private readonly notificationsGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('bell')
  @HttpCode(HttpStatus.OK)
  sendNotification(@Body() notificationDto: SendInterviewNotificationDto) {
    this.logger.log(
      `☀️☀️☀️ interview controller 收到通知請求: ${JSON.stringify(notificationDto)}`,
    );

    try {
      this.notificationService.validateNotificationLogic(notificationDto);

      if (notificationDto.to === 'all') {
        this.notificationsGateway.sendNotificationToAllClients(notificationDto);
        return {
          success: true,
          message: '通知已成功推送給[interview站的所有客戶端]。',
          site: 'interview',
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
          message: `通知已成功推送給interview站的指定用戶 [${notificationDto.to}]。`,
          site: 'interview',
          userOnline: isUserOnline,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(
        `interview站通知發送失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
