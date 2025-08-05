import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { GameRoom } from './game-room.entity';
import { PlayerStats } from './player-stats.entity';
import { GameHistory } from './game-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: 0 })
  level: number;

  @Column({ default: 0 })
  experience: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GameRoom, (gameRoom) => gameRoom.host)
  hostedRooms: GameRoom[];

  @OneToMany(() => PlayerStats, (stats) => stats.user)
  stats: PlayerStats[];

  @OneToMany(() => GameHistory, (history) => history.player)
  gameHistory: GameHistory[];
}