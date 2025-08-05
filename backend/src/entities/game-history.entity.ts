import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GameRoom } from './game-room.entity';
import { User } from './user.entity';

export enum MoveType {
  PLAY_CARD = 'play_card',
  DRAW_CARD = 'draw_card',
  SKIP_TURN = 'skip_turn',
  CHALLENGE = 'challenge',
  UNO_CALL = 'uno_call',
}

@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => GameRoom, (room) => room.gameHistory)
  @JoinColumn({ name: 'roomId' })
  room: GameRoom;

  @Column()
  playerId: string;

  @ManyToOne(() => User, (user) => user.gameHistory)
  @JoinColumn({ name: 'playerId' })
  player: User;

  @Column({ type: 'enum', enum: MoveType })
  moveType: MoveType;

  @Column({ type: 'jsonb', nullable: true })
  moveData?: Record<string, any>;

  @Column({ default: 0 })
  turnNumber: number;

  @Column({ nullable: true })
  winnerId?: string;

  @Column({ default: false })
  isGameFinished: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
