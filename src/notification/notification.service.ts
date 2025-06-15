// 驗證通知的業務邏輯，確保傳入的資料符合預期的格式和規範。
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SendNotificationDto, SiteType } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * 驗證 notification 邏輯
   */
  validateNotificationLogic(notificationDto: SendNotificationDto): void {
    // 驗證 to 欄位的邏輯
    this.validateToField(notificationDto.to);

    // 驗證 site 欄位的邏輯
    this.validateSiteField(notificationDto.site);

    // 驗證 data 欄位的邏輯
    this.validateDataField(notificationDto.data, notificationDto.site);
  }

  private validateToField(to: string): void {
    if (to !== 'all') {
      // 驗證用戶 ID 格式（假設用戶 ID 有特定格式）
      const userIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!userIdPattern.test(to)) {
        throw new BadRequestException(
          '用戶 ID 格式不正確，只能包含字母、數字、底線和連字符，長度 3-50 字元',
        );
      }
    }
  }

  private validateSiteField(site: SiteType): void {
    // 根據不同 site 類型進行額外驗證
    switch (site) {
      case SiteType.SALARY:
        // salary 相關的邏輯驗證
        break;
      case SiteType.INTERVIEW:
        // interview 相關的邏輯驗證
        break;
      default:
        throw new BadRequestException('不支援的 site 類型');
    }
  }

  private validateDataField(data: any, site: SiteType): void {
    if (!data) return;

    // 根據不同的 site 類型驗證 data 內容
    switch (site) {
      case SiteType.SALARY:
        this.validateSalaryData(data);
        break;
      case SiteType.INTERVIEW:
        this.validateInterviewData(data);
        break;
    }
  }

  private validateSalaryData(data: any): void {
    // salary 相關的 data 驗證
    // if (data.count !== undefined && data.count < 0) {
    //   throw new BadRequestException('薪資通知的 count 不能為負數');
    // }
  }

  private validateInterviewData(data: any): void {
    // interview 相關的 data 驗證
    // if (data.type && !['phone', 'video', 'onsite'].includes(data.type)) {
    //   throw new BadRequestException('面試類型只能是 phone、video 或 onsite');
    // }
  }
}
