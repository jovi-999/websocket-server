import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsObject,
  IsNumber,
  Min,
  Max,
  Length,
  Equals,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryNotificationDataDto {
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'message 長度必須在 1-500 字元之間' })
  message?: string;

  @IsOptional()
  @IsNumber({}, { message: 'count 必須是數字' })
  @Min(0, { message: 'count 不能小於 0' })
  @Max(999999, { message: 'count 不能大於 999999' })
  count?: number;

  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'type 長度必須在 1-50 字元之間' })
  type?: string;

  [key: string]: any;
}

export class SendSalaryNotificationDto {
  @IsString({ message: 'to 必須是字串' })
  @IsNotEmpty({ message: 'to 欄位不能為空' })
  @Length(1, 100, { message: 'to 長度必須在 1-100 字元之間' })
  to: string;

  @IsNotEmpty({ message: 'site 欄位不能為空' })
  @IsString({ message: 'site 必須是字串' })
  @Equals('salary', { message: 'site 必須是 salary!!' })
  site: string;

  @IsOptional()
  @IsObject({ message: 'data 必須是物件格式' })
  @ValidateNested()
  @Type(() => SalaryNotificationDataDto)
  data?: SalaryNotificationDataDto;
}
