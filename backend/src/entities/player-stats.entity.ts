import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('player_stats')
export class PlayerStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.stats)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  gamesWon: number;

  @Column({ default: 0 })
  gamesLost: number;

  @Column({ default: 0 })
  totalScore: number;

  @Column({ default: 0 })
  averageScore: number;

  @Column({ default: 0 })
  bestScore: number;

  @Column({ default: 0 })
  totalPlayTime: number; // in seconds

  @Column({ default: 0 })
  cardsPlayed: number;

  @Column({ default: 0 })
  specialCardsPlayed: number;

  @Column({ default: 0 })
  attacksLaunched: number;

  @Column({ default: 0 })
  attacksReceived: number;

  @Column({ default: 0 })
  winStreak: number;

  @Column({ default: 0 })
  bestWinStreak: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}