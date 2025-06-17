import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './notification/notification.module';
import { LoggerService } from './logger/service';

@Global() // 將 LoggerService 設為全域服務
@Module({
  imports: [NotificationModule],
  controllers: [AppController],
  providers: [AppService, LoggerService],
})
export class AppModule {}
