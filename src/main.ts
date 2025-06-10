import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl =
    process.env.FRONTEND_URL || 'https://dev.salary2020.tw:50401'; // 預設或從環境變數讀取前端URL


  const allowedOrigins = process.env.ALLOW_CORS?.split(',')
  // const allowedOrigins = [
  //   'http://127.0.0.1:3000', // 本地開發環境
  //   'https://dev.salary2020.tw:50401',
  // ];

  app.enableCors({
    origin: allowedOrigins, // 允許來自你的 Laravel 前端應用的請求
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 允許的 HTTP 方法
    // credentials: true, // 如果要傳送 cookies 或 authorization headers，設定為 true
    allowedHeaders: 'Content-Type, Accept, Authorization', // 允許的請求標頭
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Nest.js API is running on: ${await app.getUrl()}`);
  console.log(`Allowing CORS for origin: ${frontendUrl}`);
}

bootstrap();
