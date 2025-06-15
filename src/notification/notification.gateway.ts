import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  NotificationPayload,
  NotificationData,
} from './interfaces/notification.interface';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Logger } from '@nestjs/common';

const allowedOrigins = process.env.ALLOW_CORS?.split(',');

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
  @WebSocketServer() // 注入 socket.io 的 Server 實例，用於廣播訊息
  server: Server; // 定義 WebSocket 伺服器實例

  // 儲存 socket 連線 (用於管理所有連線)
  public connectedClients: Map<string, Socket> = new Map();
  // 儲存使用者 userId 和其所有的 socket 連線 (用於管理特定使用者的多個連線)
  private userSockets: Map<string, Set<Socket>> = new Map();

  // 用於追蹤每個 IP 的連線數 (用於實施連線數限制)
  private ipConnections: Map<string, number> = new Map();
  // 儲存 IP 對應的計時器 (用於實現超時斷線)
  private ipTimeoutMap: Map<string, NodeJS.Timeout> = new Map();

  // 連線數限制常數
  private readonly MAX_CONNECTIONS_PER_USER = 3; // 每個用戶最大連線數
  private readonly MAX_CONNECTIONS_PER_IP = 3; // 每個 IP 最大連線數

  // 超時斷線相關常數
  // 設定超時斷線的時間 (例如：1 分鐘後自動斷開連線)
  // 這裡的時間是以毫秒為單位，所以 1000 * 60 = 60000 毫秒 = 1 分鐘
  private readonly TIMEOUT_DURATION = 1000 * 60; // 1 分鐘 (毫秒)
  private readonly TIMEOUT_MINUTES = 10; // 10 分鐘
  private readonly TIMEOUT_TIMES = this.TIMEOUT_DURATION * this.TIMEOUT_MINUTES;

  private logger: Logger = new Logger('NotificationsGateway');

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    // private readonly logger: LoggerService,
  ) {}

  /**
   * 當客戶端建立 WebSocket 連線時觸發 (Socket.IO 的內建行為)。
   * (例如開啟瀏覽器分頁，前端執行 `const socket = io('NESTJS_SOCKET_SERVER_URL')` 並成功連線時，自動觸發)
   *
   * NestJS 會自動為實作 `OnGatewayConnection` 介面的 Gateway 調用此方法。
   * @param client 連線的 Socket 實例
   */
  handleConnection(client: Socket) {
    // 從連線握手階段的查詢參數中獲取 userId
    // 確保前端在建立連線時，透過 `query: { userId: 'YOUR_USER_ID' }` 傳遞。
    const userId = client.handshake.query.userId as string;
    console.log(
      `👉🏻 [Connection Attempt] client.id: ${client.id}, userId: ${userId} 👈🏻`,
    );

    // --- userId 驗證 ---
    // 如果 userId 無效 (undefined, 'null' 字串, 或空字串)，則斷開連線並阻止後續處理。
    if (!userId || userId === 'null' || userId === '') {
      console.error(
        `❌ [Connection Rejected] 未提供有效 userId，斷開連線: ${client.id}`,
      );
      client.emit('errorMessage', '連線失敗：未提供有效的 userId。');
      client.disconnect(true); // 強制斷開，不允許前端自動重連此類錯誤
      return; // 立即返回，不執行後續連線邏輯
    }

    // --- 連線數限制 (USER) ---
    const currentUserConnections = this.userSockets.get(userId)?.size || 0;
    if (currentUserConnections >= this.MAX_CONNECTIONS_PER_USER) {
      // 每個使用者的連線數限制
      console.warn(
        `⚠️ [Connection Limit] userId: ${userId} 超過連線數限制 (${this.MAX_CONNECTIONS_PER_USER})，clientId 斷開連線: ${client.id}`,
      );
      client.emit(
        'errorMessage',
        `［連線失敗］每個使用者的連線數超過限制 (${this.MAX_CONNECTIONS_PER_USER})。`,
      );
      client.disconnect(true); // 強制斷開
      return;
    }

    // --- 連線數限制 (IP) ---
    const ip = client.handshake.address;
    const currentIpConnections = this.ipConnections.get(ip) || 0;

    if (currentIpConnections >= this.MAX_CONNECTIONS_PER_IP) {
      console.warn(
        `⚠️ [Connection Limit] IP: ${ip} 超過連線數限制 (${this.MAX_CONNECTIONS_PER_IP}) {})，clientId 斷開連線: ${client.id}`,
      );
      client.emit(
        'errorMessage',
        `［連線失敗］每個 IP 的連線數超過限制 (${this.MAX_CONNECTIONS_PER_IP}))。`,
      );
      client.disconnect(true); // 強制斷開
      return;
    }

    // --- 如果驗證通過，則繼續處理連線 ---
    // --- 記錄 IP 連線數 ---
    this.ipConnections.set(ip, currentIpConnections + 1); // 增加 IP 連線計數

    // --- 將 client.id 和 Socket 實例加入到 connectedClients Map (管理所有活躍連線) ---
    this.connectedClients.set(client.id, client);
    console.log(`✅ [Connected] client.id: ${client.id}`);

    // --- 將 Socket 實例加入到 userId 對應的 userSockets Map (管理特定用戶的多個連線) ---
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.add(client);
    }

    // --- 記錄用戶連線狀態 ---
    console.log(
      `========= [User Mapped] userId: ${userId}, client.id: ${client.id} =========`,
    );
    console.log(
      `🌐 [IP Connections 目前IP連線數] ${ip}:`,
      Array.from(this.ipConnections.entries()),
    );
    console.log(
      `👥 [User Connections 目前 user 連線數] userId: ${userId}:`,
      this.userSockets.get(userId)?.size,
    );

    // --- 設置超時計時器 ---
    const timeoutId = setTimeout(() => {
      console.log(`[Timeout] client.id: ${client.id} 因超時自動斷開。`);
      client.emit('errorMessage', '連線超時，已自動斷開。');
      client.disconnect(true);
    }, this.TIMEOUT_TIMES);
    this.ipTimeoutMap.set(client.id, timeoutId); // 儲存計時器 ID

    // --- 發送確認訊息 ---
    client.emit('connectionConfirmed', { userId, clientId: client.id });
    // --- 廣播在線狀態(目前沒用到，暫時先註解) ---
    // this.broadcastOnlineUsers(); // 廣播更新後的在線使用者列表
    // this.broadcastUserGoingOnline(userId); // 廣播特定用戶上線通知
  }

  /**
   * 當客戶端斷開 WebSocket 連線時觸發 (Socket.IO 的內建行為)。
   * (自動觸發，當客戶端關閉分頁、網路中斷或手動斷開連線時）
   *
   * NestJS 會自動為實作 `OnGatewayDisconnect` 介面的 Gateway 調用此方法。
   * @param client 斷開的 Socket 實例
   */
  handleDisconnect(client: Socket): void {
    const userId = client.handshake.query.userId as string; // 再次從 query 中獲取 userId
    const ip = client.handshake.address;

    console.log(
      `❌ [Disconnected] client.id: ${client.id}, userId: ${userId || 'N/A'}`,
    );

    // --- 清理 IP 連線計數 ---
    const currentIpConnections = this.ipConnections.get(ip) || 0;
    this.ipConnections.set(ip, Math.max(0, currentIpConnections - 1));

    // --- 清理超時計時器 ---
    const timeoutId = this.ipTimeoutMap.get(client.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.ipTimeoutMap.delete(client.id);
      console.log(`🧹 [Cleanup] 清理計時器 for client.id: ${client.id}`);
    }

    // --- 從 userSockets Map 移除斷開的 Socket ---
    let userBecameOffline: string | null = null; // 用於判斷用戶是否完全下線
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client); // 從該用戶的連線集合中移除此 Socket
        if (sockets.size === 0) {
          // 如果該用戶已無任何活躍連線，則將該用戶從 userSockets Map 中移除
          this.userSockets.delete(userId);
          userBecameOffline = userId; // 標記為完全下線
        }
      }
    }

    // --- 從 connectedClients Map 移除斷開的 Socket ---
    this.connectedClients.delete(client.id);

    // --- 廣播更新後的在線狀態 (目前沒用到，暫時先註解) ---
    // this.broadcastOnlineUsers(); // 廣播更新後的在線使用者列表

    // --- 廣播用戶下線通知 (如果用戶所有連線都已斷開) ---
    if (userBecameOffline) {
      // this.server.emit('sysMessage', `${userBecameOffline} 下線了`); (目前沒用到，暫時先註解)
      console.log(`💬 [Offline] 用戶 ${userBecameOffline} 已完全下線。`);
    }
  }

  /**
   * 📡 廣播通知給所有已連接的客戶端 (此方法由 NotificationsController 呼叫)
   * @param payload 通知內容，通常是一個物件，包含訊息和其他相關資料
   *
   * 此方法會將通知廣播給所有已連接的客戶端。
   * 前端監聽 'notificationToAll' 事件來接收這些通知。
   */
  sendNotificationToAllClients(payload: NotificationPayload): void {
    const broadcastPayload = { ...payload, to: 'all' as const }; // 確保 payload 包含 'to' 欄位
    this.server.emit('notificationToAll', broadcastPayload);
    this.logger.log(
      `已發送通知給所有客戶端: ${JSON.stringify(broadcastPayload)}`,
    );
  }

  /**
   * 📡 發送通知給特定使用者 (此方法由 NotificationsController 呼叫)
   * @param userId 特定使用者的 ID
   * @param site 來源網站或應用程式名稱
   * @param data 通知內容，通常是一個字串或物件
   */
  sendNotificationToSpecificUser(
    userId: string,
    site: string,
    data: NotificationData | undefined,
  ): boolean {
    // 使用 userSockets 來尋找特定使用者的所有連線，驗證使用者是否在線
    const targetSockets = this.userSockets.get(userId);

    if (targetSockets && targetSockets.size > 0) {
      this.logger.log(
        `找到使用者 ${userId} 的 ${targetSockets.size} 個連線，準備發送訊息...`,
      );

      // 處理 data 可能為 undefined 的情況
      const notificationData = data || { message: '預設通知' };

      // 發送訊息給該使用者的所有連線實例（例如使用者開了多個分頁）
      targetSockets.forEach((socket) => {
        // 'notificationToUser' 是前端監聽的事件名稱
        socket.emit('notificationToUser', {
          from: 'Server',
          to: userId,
          site,
          data: notificationData,
        });
      });

      return true; // 用戶在線且訊息已發送
    } else {
      // 如果在 userSockets 中找不到，表示使用者真的不在線上
      this.logger.error(`userId ${userId} 使用者不在線上.`);
      return false; // 用戶不在線，訊息未發送
    }
  }

  /**
   * ❗❗❗❗❗ 以下 function 暫時沒用到 ❗❗❗❗❗
   */

  /**
   * 處理來自客戶端的訊息
   * @param data 前端發送的訊息資料
   * @param client 連接的客戶端
   */
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

  /**
   * 📡 廣播在線使用者列表
   * 此方法會收集所有在線使用者的自定義 ID 和連線數，並廣播給所有已連接的客戶端。
   * 前端可以監聽 'onlineUsers' 事件來接收這些資訊。
   * @private
   * @returns {void}
   *
   * 注意：此方法會遍歷 userSockets Map，並將每個使用者的自定義 ID 和當前連線數組成物件。
   * 最後，使用 this.server.emit() 方法廣播這些資訊給所有已連接的客戶端。
   * 前端可以透過監聽 'onlineUsers' 事件來獲取在線使用者列表。
   */
  private broadcastOnlineUsers(): void {
    const onlineUsers = Array.from(this.userSockets.entries()).map(
      ([customId, sockets]) => ({
        customId,
        connectionCount: sockets.size, // 確保使用當前連線數
      }),
    );
    console.log('💬 [onlineUsers] 廣播在線使用者列表:', onlineUsers);
    this.server.emit('onlineUsers', onlineUsers);
  }

  /**
   * 📡 廣播某個使用者上線的通知
   * @param customId 使用者的自定義 ID
   * 此方法會廣播一條系統訊息，通知所有已連接的客戶端某個使用者已經上線。
   * 前端監聽 'sysMessage' 事件來接收這些通知。
   */
  private broadcastUserGoingOnline(customId: string): void {
    this.server.emit('sysMessage', `${customId} 上線了`);
  }

  /**
   * 模擬斷開所有連線
   * @param client 連接的客戶端
   * @description 當前端發送 'simulateDisconnect' 事件時，伺服器會斷開所有連線。
   * 用於測試或模擬斷線情況。前端可以透過 `socket.emit('simulateDisconnect')` 來觸發此事件。
   * !!!! 注意：它會斷開所有連線，可能會影響所有使用者。
   */
  @SubscribeMessage('simulateDisconnect')
  handleSimulateDisconnect(): void {
    console.log('模擬斷開所有連線');
    this.server.emit('sysMessage', '伺服器即將斷開所有連線');
    // 斷開所有連線
    this.server.sockets.sockets.forEach((socket) => {
      socket.emit('errorMessage', '伺服器模擬斷線');
      socket.disconnect(true);
    });
  }
}
