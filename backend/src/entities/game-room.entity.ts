import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { GameState } from './game-state.entity';
import { GameHistory } from './game-history.entity';

export enum GameRoomStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

@Entity('game_rooms')
export class GameRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  hostId: string;

  @ManyToOne(() => User, (user) => user.hostedRooms)
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column({ default: 8 })
  maxPlayers: number;

  @Column({ default: 2 })
  minPlayers: number;

  @Column({ type: 'enum', enum: GameRoomStatus, default: GameRoomStatus.WAITING })
  status: GameRoomStatus;

  @Column({ type: 'jsonb', default: [] })
  playerIds: string[];

  @Column({ type: 'jsonb', default: {} })
  gameSettings: Record<string, any>;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: false })
  isPrivate: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GameState, (gameState) => gameState.room)
  gameStates: GameState[];

  @OneToMany(() => GameHistory, (history) => history.room)
  gameHistory: GameHistory[];
}
