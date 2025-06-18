import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsObject,
  Length,
  Equals,
  // IsNumber,
  // Min,
  // Max,
  // IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InterviewNotificationDataDto {
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'message 長度必須在 1-500 字元之間' })
  message?: string;

  // 未用到的範例，先註解掉
  // @IsOptional()
  // @IsNumber({}, { message: 'count 必須是數字' })
  // @Min(0, { message: 'count 不能小於 0' })
  // @Max(999999, { message: 'count 不能大於 999999' })
  // count?: number;

  // @IsOptional()
  // @IsString()
  // @IsIn(['phone', 'video', 'onsite'], {
  //   message: 'type 必須是 phone、video 或 onsite 其中之一',
  // })
  // type?: 'phone' | 'video' | 'onsite';

  [key: string]: any;
}

export class SendInterviewNotificationDto {
  @IsString({ message: 'to 必須是字串' })
  @IsNotEmpty({ message: 'to 欄位不能為空' })
  @Length(1, 100, { message: 'to 長度必須在 1-100 字元之間' })
  to: string;

  @IsNotEmpty({ message: 'site 欄位不能為空' })
  @IsString({ message: 'site 必須是字串' })
  @Equals('interview', { message: 'site 必須是 interview!!' })
  site: string;

  @IsOptional()
  @IsObject({ message: 'data 必須是物件格式' })
  @ValidateNested()
  @Type(() => InterviewNotificationDataDto)
  data?: InterviewNotificationDataDto;
}
