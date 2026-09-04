import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SocketEvent } from '@restaurant-os/types';

/**
 * Socket.IO Events Gateway
 *
 * Room hierarchy for tenant isolation:
 * - restaurant:{restaurantId}  — restaurant staff/dashboard
 * - outlet:{outletId}          — outlet-specific events
 * - kitchen:{outletId}         — kitchen display only
 * - session:{tableSessionId}   — customer-facing session events
 *
 * Authentication:
 * - Staff: JWT token in handshake auth
 * - Customers: Session token (anonymous)
 *
 * NEVER broadcasts globally — always scoped to a room.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/events',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });
        client.data.userId = payload.sub;
        client.data.email = payload.email;
        this.logger.debug({
          msg: 'Authenticated client connected',
          userId: payload.sub,
          socketId: client.id,
        });
      } else {
        // Anonymous client (customer)
        client.data.isAnonymous = true;
        this.logger.debug({ msg: 'Anonymous client connected', socketId: client.id });
      }
    } catch (error) {
      // Invalid token — don't disconnect, just mark as anonymous
      client.data.isAnonymous = true;
      this.logger.debug({ msg: 'Client connected with invalid token', socketId: client.id });
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug({ msg: 'Client disconnected', socketId: client.id });
  }

  // ─────────────────────────────────────────────
  // Room join/leave handlers
  // ─────────────────────────────────────────────

  @SubscribeMessage(SocketEvent.JOIN_RESTAURANT)
  async handleJoinRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string; outletId?: string },
  ) {
    const { restaurantId, outletId } = data;

    if (!restaurantId) return { error: 'restaurantId is required' };

    // Staff only — must be authenticated
    if (!client.data.userId) {
      return { error: 'Authentication required to join restaurant room' };
    }

    await client.join(`restaurant:${restaurantId}`);

    if (outletId) {
      await client.join(`outlet:${outletId}`);
      await client.join(`kitchen:${outletId}`);
    }

    client.data.restaurantId = restaurantId;
    this.logger.debug({
      msg: 'Staff joined restaurant room',
      userId: client.data.userId,
      restaurantId,
      outletId,
    });

    return { success: true, rooms: client.rooms };
  }

  @SubscribeMessage(SocketEvent.JOIN_TABLE_SESSION)
  async handleJoinTableSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableSessionId: string; restaurantId?: string },
  ) {
    const { tableSessionId, restaurantId } = data;

    if (!tableSessionId) return { error: 'tableSessionId is required' };

    // Customers join session room (no auth required for session-level events)
    await client.join(`session:${tableSessionId}`);

    client.data.tableSessionId = tableSessionId;

    this.logger.debug({
      msg: 'Client joined table session room',
      socketId: client.id,
      tableSessionId,
      isAnonymous: client.data.isAnonymous,
    });

    return { success: true };
  }

  @SubscribeMessage(SocketEvent.LEAVE_RESTAURANT)
  async handleLeaveRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string },
  ) {
    const { restaurantId } = data;
    await client.leave(`restaurant:${restaurantId}`);
    return { success: true };
  }

  // ─────────────────────────────────────────────
  // Emit helpers (called by services)
  // ─────────────────────────────────────────────

  /**
   * Emit an event to all connected staff in a restaurant room.
   */
  async emitToRestaurant(
    restaurantId: string,
    event: SocketEvent,
    payload: unknown,
  ): Promise<void> {
    this.server.to(`restaurant:${restaurantId}`).emit(event, payload);
    this.logger.debug({ msg: 'Emitted to restaurant', restaurantId, event });
  }

  /**
   * Emit an event to all clients in a table session room (customers + staff watching session).
   */
  async emitToSession(
    tableSessionId: string,
    event: SocketEvent,
    payload: unknown,
  ): Promise<void> {
    this.server.to(`session:${tableSessionId}`).emit(event, payload);
    this.logger.debug({ msg: 'Emitted to session', tableSessionId, event });
  }

  /**
   * Emit an event to kitchen display in an outlet.
   */
  async emitToKitchen(outletId: string, event: SocketEvent, payload: unknown): Promise<void> {
    this.server.to(`kitchen:${outletId}`).emit(event, payload);
    this.logger.debug({ msg: 'Emitted to kitchen', outletId, event });
  }

  /**
   * Emit an event to a specific outlet.
   */
  async emitToOutlet(outletId: string, event: SocketEvent, payload: unknown): Promise<void> {
    this.server.to(`outlet:${outletId}`).emit(event, payload);
  }
}
