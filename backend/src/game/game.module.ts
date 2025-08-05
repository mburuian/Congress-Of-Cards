import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameState } from '../entities/game-state.entity';
import { GameRoom } from '../entities/game-room.entity';
import { GameHistory } from '../entities/game-history.entity';
import { GameRoomModule } from '../game-room/game-room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameState, GameRoom, GameHistory]),
    GameRoomModule,
  ],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}

// src/game/game.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GameService } from './game.service';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private gameService: GameService) {}

  @Get(':roomId/state')
  async getGameState(@Param('roomId') roomId: string) {
    return await this.gameService.getGameState(roomId);
  }

  @Post(':roomId/start')
  async startGame(@Param('roomId') roomId: string, @Request() req) {
    return await this.gameService.startGame(roomId);
  }

  @Post(':gameStateId/play-card')
  async playCard(
    @Param('gameStateId') gameStateId: string,
    @Body() body: { cardId: string },
    @Request() req,
  ) {
    return await this.gameService.playCard(gameStateId, req.user.userId, body.cardId);
  }

  @Post(':gameStateId/draw-card')
  async drawCard(
    @Param('gameStateId') gameStateId: string,
    @Request() req,
  ) {
    return await this.gameService.drawCard(gameStateId, req.user.userId);
  }
}

// src/game-room/game-room.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRoom, GameRoomStatus } from '../entities/game-room.entity';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

export interface CreateRoomDto {
  name: string;
  description?: string;
  maxPlayers?: number;
  password?: string;
  isPrivate?: boolean;
  gameSettings?: Record<string, any>;
}

export interface JoinRoomDto {
  password?: string;
}

@Injectable()
export class GameRoomService {
  constructor(
    @InjectRepository(GameRoom)
    private gameRoomRepo: Repository<GameRoom>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(hostId: string, createRoomDto: CreateRoomDto): Promise<GameRoom> {
    const host = await this.userRepo.findOne({ where: { id: hostId } });
    if (!host) throw new BadRequestException('Host not found');

    const hashedPassword = createRoomDto.password 
      ? await bcrypt.hash(createRoomDto.password, 10)
      : undefined;

    const room = this.gameRoomRepo.create({
      ...createRoomDto,
      hostId,
      playerIds: [hostId],
      password: hashedPassword,
      status: GameRoomStatus.WAITING,
    });

    return await this.gameRoomRepo.save(room);
  }

  async findAll(userId: string): Promise<GameRoom[]> {
    return await this.gameRoomRepo.find({
      where: { isPrivate: false, status: GameRoomStatus.WAITING },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<GameRoom | null> {
    return await this.gameRoomRepo.findOne({
      where: { id },
      relations: ['host'],
    });
  }

  async joinRoom(roomId: string, userId: string, joinRoomDto: JoinRoomDto): Promise<GameRoom> {
    const room = await this.findOne(roomId);
    if (!room) throw new BadRequestException('Room not found');

    if (room.status !== GameRoomStatus.WAITING) {
      throw new BadRequestException('Room is not accepting players');
    }

    if (room.playerIds.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full');
    }

    if (room.playerIds.includes(userId)) {
      throw new BadRequestException('Already in room');
    }

    // Check password if room is protected
    if (room.password && joinRoomDto.password) {
      const isValidPassword = await bcrypt.compare(joinRoomDto.password, room.password);
      if (!isValidPassword) {
        throw new ForbiddenException('Invalid password');
      }
    } else if (room.password) {
      throw new ForbiddenException('Password required');
    }

    room.playerIds.push(userId);
    return await this.gameRoomRepo.save(room);
  }

  async leaveRoom(roomId: string, userId: string): Promise<GameRoom> {
    const room = await this.findOne(roomId);
    if (!room) throw new BadRequestException('Room not found');

    if (!room.playerIds.includes(userId)) {
      throw new BadRequestException('Not in room');
    }

    room.playerIds = room.playerIds.filter(id => id !== userId);

    // If host leaves, assign new host or delete room
    if (room.hostId === userId) {
      if (room.playerIds.length > 0) {
        room.hostId = room.playerIds[0];
      } else {
        await this.gameRoomRepo.delete(roomId);
        return room;
      }
    }

    return await this.gameRoomRepo.save(room);
  }

  async getRoomPlayers(roomId: string): Promise<User[]> {
    const room = await this.findOne(roomId);
    if (!room) throw new BadRequestException('Room not found');

    return await this.userRepo.findByIds(room.playerIds);
  }

  async updateRoomStatus(roomId: string, status: GameRoomStatus): Promise<GameRoom> {
    const room = await this.findOne(roomId);
    if (!room) throw new BadRequestException('Room not found');

    room.status = status;
    return await this.gameRoomRepo.save(room);
  }

  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.findOne(roomId);
    if (!room) throw new BadRequestException('Room not found');

    if (room.hostId !== userId) {
      throw new ForbiddenException('Only host can delete room');
    }

    await this.gameRoomRepo.delete(roomId);
  }
}