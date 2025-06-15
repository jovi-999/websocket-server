import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * 使用 ValidationPipe 來自動驗證和轉換 DTO
   *
   * ValidationPipe 是 NestJS 的一個內建管道，用於自動驗證和轉換請求資料。
   * 它可以根據 DTO 中的裝飾器（如 @IsString()、@IsEnum() 等）自動驗證請求資料，
   * 並將普通 JavaScript 物件轉換為 DTO 類別實例。
   *
   * 這樣可以確保 API 接收到的資料符合預期格式，並且在驗證失敗時自動回傳 400 Bad Request 錯誤。
   *
   * 這裡的設定包括：
   * - `transform: true`：啟用自動轉換 DTO，將請求資料轉換為 DTO 類別實例。
   * - `whitelist: true`：過濾掉 DTO 中未定義的屬性，確保只保留需要的屬性。
   * - `forbidNonWhitelisted: true`：當請求中包含未定義的屬性時，拒絕請求並回傳 400 錯誤。
   *
   * 這樣的設定可以提高 API 的安全性和穩定性，確保只有符合預期格式的請求才能通過。
   *
   * 更多資訊可以參考 NestJS 官方文檔：https://docs.nestjs.com/pipes#validation-pipe
   *
   * @see https://docs.nestjs.com/pipes#validation-pipe
   */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 啟用自動轉換 DTO
      whitelist: true, // 過濾多餘屬性
      forbidNonWhitelisted: true, // 拒絕多餘屬性
    }),
  );

  const frontendUrl =
    process.env.FRONTEND_URL || 'https://dev.salary2020.tw:50401'; // 預設或從環境變數讀取前端URL

  const allowedOrigins = process.env.ALLOW_CORS?.split(',');

  app.enableCors({
    origin: allowedOrigins, // 允許來自你的 Laravel 前端應用的請求
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 允許的 HTTP 方法
    // credentials: true, // 如果要傳送 cookies 或 authorization headers，設定為 true
    allowedHeaders: 'Content-Type, Accept, Authorization', // 允許的請求標頭
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `📢 Nest.js API is running on: ${await app.getUrl()} 👉🏻 Allowing CORS for origin: ${frontendUrl}`,
  );
}

bootstrap();
