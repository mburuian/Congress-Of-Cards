import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRoomService } from './game-room.service';
import { GameRoomController } from './game-room.controller';
import { GameRoom } from '../entities/game-room.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameRoom, User])],
  providers: [GameRoomService],
  controllers: [GameRoomController],
  exports: [GameRoomService],
})
export class GameRoomModule {}

// src/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PlayerStats } from '../entities/player-stats.entity';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(PlayerStats)
    private statsRepo: Repository<PlayerStats>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.userRepo.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new BadRequestException('Username or email already exists');
    }

    const user = this.userRepo.create(createUserDto);
    const savedUser = await this.userRepo.save(user);

    // Create initial stats for user
    const stats = this.statsRepo.create({ userId: savedUser.id });
    await this.statsRepo.save(stats);

    return savedUser;
  }

  async findOne(id: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new BadRequestException('User not found');

    // Check if new username/email conflicts with existing users
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser) throw new BadRequestException('Username already exists');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) throw new BadRequestException('Email already exists');
    }

    Object.assign(user, updateUserDto);
    return await this.userRepo.save(user);
  }

  async getUserStats(userId: string): Promise<PlayerStats | null> {
    return await this.statsRepo.findOne({ where: { userId } });
  }

  async updateStats(userId: string, statsUpdate: Partial<PlayerStats>): Promise<PlayerStats> {
    let stats = await this.getUserStats(userId);
    if (!stats) {
      stats = this.statsRepo.create({ userId, ...statsUpdate });
    } else {
      Object.assign(stats, statsUpdate);
    }
    return await this.statsRepo.save(stats);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastLoginAt: new Date() });
  }

  async addExperience(userId: string, exp: number): Promise<User> {
    const user = await this.findOne(userId);
    if (!user) throw new BadRequestException('User not found');

    user.experience += exp;
    
    // Level up logic (every 1000 exp = 1 level)
    const newLevel = Math.floor(user.experience / 1000);
    if (newLevel > user.level) {
      user.level = newLevel;
    }

    return await this.userRepo.save(user);
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await this.userRepo.find({
      order: { experience: 'DESC' },
      take: limit,
    });
  }
}
