import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BaseService } from './base.service';

@Injectable()
export class BaseWsService {
  private readonly logger = new Logger(BaseWsService.name);
  private server: Server | null = null;

  constructor(private readonly baseService: BaseService) {}

  setServer(server: Server): void {
    this.server = server;
  }

  isBaseEvent(data: any): boolean {
    return Boolean(data?.operation?.startsWith('base:') || data?.baseId);
  }

  async handleInbound(client: Socket, data: any): Promise<void> {
    if (!this.server) return;
    const room = data?.pageId ? `base:${data.pageId}` : null;
    if (data?.operation === 'base:join' && room) {
      await client.join(room);
      return;
    }
    if (room) {
      client.to(room).emit('base:event', { ...data, from: client.id });
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.debug(`base client disconnected ${client.id}`);
  }
}
