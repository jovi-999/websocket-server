import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

const allowedOrigins = [
  'http://127.0.0.1:3000', // 本地開發環境
  'https://dev.salary2020.tw:50401',
];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'], // 允許的 HTTP 方法 for Socket.IO handshaking
    // credentials: true, // 如果前端 Socket.IO client 有設定 withCredentials: true
  },
  // namespace: 'notifications', // (可選)如果想將通知功能放在特定命名空間下
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server; // Socket.IO Server 實例

  private logger: Logger = new Logger('NotificationsGateway');

  // 當有新的客戶端連接時觸發
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`前端客戶端已連接: ${client.id}`);

    this.server.emit('connectionSuccess', {
      message: '連接成功',
      clientId: client.id,
    });
    // 可以在這裡處理客戶端的身份驗證或其他初始化邏輯
    // 例如：const userId = client.handshake.query.userId;
    // 如果有 userId，可以將客戶端加入特定的房間
    // if (userId) {
    //   client.join(`user_${userId}`);
    //   this.logger.log(`用戶 ${userId} 已加入房間 user_${userId}`);
    // }
    // 如果需要限制每個用戶的連接數量，可以在這裡處理邏輯
    // this.limitUserConnections(userId, client.id);
  }

  // 當客戶端斷開連接時觸發
  handleDisconnect(client: Socket) {
    this.logger.log(`前端客戶端已斷開: ${client.id}`);
  }

  /**
   * 此方法由 NotificationsController 呼叫，
   * 用來將通知廣播給所有已連接的前端客戶端。
   * @param payload - 要傳送的通知內容 (例如：{ message: '新的未讀訊息', count: 5 })
   */
  sendNotificationToAllClients(payload: any) {
    // 'newNotification' 是前端會監聽的事件名稱
    this.server.emit('newNotification', payload);
    this.logger.log(`已發送通知給所有客戶端: ${JSON.stringify(payload)}`);
  }

  // (可選)如果前端也需要透過 Socket.IO 發送訊息給後端
  @SubscribeMessage('messageFromClient') // 'messageFromClient' 是前端發送時使用的事件名稱
  handleClientMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(
      `收到來自客戶端 ${client.id} 的訊息: ${JSON.stringify(data)}`,
    );
    // 可在此處理前端發來的訊息，例如回傳一個確認訊息
    // client.emit('serverAck', { status: 'received', originalData: data });
  }
}
