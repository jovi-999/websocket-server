import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SendSalaryNotificationDto } from './dto/salary-notification.dto';
import { SendInterviewNotificationDto } from './dto/interview-notification.dto';
import { LoggerService } from 'src/logger/service';

type NotificationDto = SendSalaryNotificationDto | SendInterviewNotificationDto;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly loggerService: LoggerService) {}

  validateNotificationLogic(notificationDto: NotificationDto): void {
    this.validateToField(notificationDto.to);
    this.validateSiteField(notificationDto.site);
    this.validateDataField(notificationDto.data, notificationDto.site);
  }

  private validateToField(to: string): void {
    if (to !== 'all') {
      const userIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!userIdPattern.test(to)) {
        this.loggerService.error(`用戶 ID 格式錯誤: ${to}`, {
          context: NotificationService.name,
        });
        throw new BadRequestException(
          '用戶 ID 格式不正確，只能包含字母、數字、底線和連字符，長度 3-50 字元',
        );
      }
    }
  }

  private validateSiteField(site: string): void {
    switch (site) {
      case 'salary':
        this.loggerService.error('執行 salary 驗證規則', {
          context: NotificationService.name,
        });
        break;
      case 'interview':
        this.loggerService.error('執行 interview 驗證規則', {
          context: NotificationService.name,
        });
        break;
      default:
        throw new BadRequestException(`不支援的 site 類型: ${site}`);
    }
  }

  private validateDataField(data: any, site: string): void {
    if (!data) return;

    switch (site) {
      case 'salary':
        this.validateSalaryData(data);
        break;
      case 'interview':
        this.validateInterviewData(data);
        break;
    }
  }

  private validateSalaryData(data: any): void {
    // if (data.count !== undefined && data.count < 0) {
    //   throw new BadRequestException('薪資通知的 count 不能為負數');
    // }
    // if (data.salaryAmount && data.salaryAmount <= 0) {
    //   throw new BadRequestException('薪資金額必須大於 0');
    // }
  }

  private validateInterviewData(data: any): void {
    // if (data.type && !['phone', 'video', 'onsite'].includes(data.type)) {
    //   throw new BadRequestException('面試類型只能是 phone、video 或 onsite');
    // }
    // if (data.interviewDate && new Date(data.interviewDate) < new Date()) {
    //   throw new BadRequestException('面試日期不能是過去的時間');
    // }
  }
}
