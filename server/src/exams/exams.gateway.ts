import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Explicitly support both
})
export class ExamsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, { userId: string; role: string }>(); // socketId -> user info

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Socket Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket Client disconnected: ${client.id}`);
    const userInfo = this.onlineUsers.get(client.id);
    this.onlineUsers.delete(client.id);
    if (userInfo) {
      this.server.emit('userStatusChanged', { userId: userInfo.userId, status: 'offline', role: userInfo.role });
    }
  }

  @SubscribeMessage('identify')
  handleIdentify(client: Socket, data: any) {
    const userId = typeof data === 'string' ? data : data.userId;
    const role = typeof data === 'string' ? 'student' : (data.role || 'student');
    
    console.log(`User ${userId} (${role}) identified on socket ${client.id}`);
    this.onlineUsers.set(client.id, { userId, role });
    this.server.emit('userStatusChanged', { userId, status: 'online', role });
  }

  getOnlineUserIds(): string[] {
    return Array.from(new Set(Array.from(this.onlineUsers.values()).map(u => u.userId)));
  }

  getOnlineUsersCount(): number {
    return this.getOnlineStudentsCount();
  }

  getOnlineStudentsCount(): number {
    const studentUserIds = Array.from(this.onlineUsers.values())
      .filter(u => u.role === 'student')
      .map(u => u.userId);
    return new Set(studentUserIds).size;
  }

  isUserOnline(userId: string): boolean {
    return Array.from(this.onlineUsers.values()).some(u => u.userId === userId);
  }

  emitStatsUpdate(data: any) {
    console.log('Emitting real-time stats update to all clients');
    this.server.emit('statsUpdated', data);
  }

  emitExamCreated(exam: any) {
    console.log('Emitting real-time exam created event');
    this.server.emit('examCreated', exam);
  }

  emitExamDeleted(examId: string) {
    console.log('Emitting real-time exam deleted event');
    this.server.emit('examDeleted', examId);
  }

  emitInstructorStatsUpdate(data: any) {
    console.log('Emitting real-time instructor stats update');
    this.server.emit('instructorStatsUpdated', data);
  }

  emitViolation(data: any) {
    console.log('Emitting real-time violation alert to instructors');
    this.server.emit('violationLogged', data);
  }
}
