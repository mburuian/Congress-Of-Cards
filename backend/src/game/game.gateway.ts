import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { GameRoomService } from '../game-room/game-room.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private gameService: GameService,
    private gameRoomService: GameRoomService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    try {
      await client.join(roomId);
      this.connectedUsers.set(client.id, userId);
      
      const gameState = await this.gameService.getGameState(roomId);
      
      client.emit('joined-room', { roomId, gameState });
      client.to(roomId).emit('player-joined', { userId });
      
      console.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('play-card')
  async handlePlayCard(
    @MessageBody() data: { gameStateId: string; playerId: string; cardId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const gameState = await this.gameService.playCard(
        data.gameStateId,
        data.playerId,
        data.cardId,
      );
      
      // Broadcast updated game state to all players in the room
      this.server.to(gameState.roomId).emit('game-state-updated', gameState);
      
      if (gameState.winnerId) {
        this.server.to(gameState.roomId).emit('game-finished', {
          winnerId: gameState.winnerId,
          gameState,
        });
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('draw-card')
  async handleDrawCard(
    @MessageBody() data: { gameStateId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const gameState = await this.gameService.drawCard(
        data.gameStateId,
        data.playerId,
      );
      
      this.server.to(gameState.roomId).emit('game-state-updated', gameState);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('start-game')
  async handleStartGame(
    @MessageBody() data: { roomId: string; hostId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.gameRoomService.findOne(data.roomId);
      if (!room || room.hostId !== data.hostId) {
        throw new Error('Unauthorized to start game');
      }

      const gameState = await this.gameService.startGame(data.roomId);
      
      this.server.to(data.roomId).emit('game-started', gameState);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await client.leave(data.roomId);
      this.connectedUsers.delete(client.id);
      
      client.to(data.roomId).emit('player-left', { userId: data.userId });
      
      console.log(`User ${data.userId} left room ${data.roomId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('get-game-state')
  async handleGetGameState(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const gameState = await this.gameService.getGameState(data.roomId);
      client.emit('game-state', gameState);
    } catch (error) {
      client.emit('error', { message: 'Failed to get game state' });
    }
  }
}