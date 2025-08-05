import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GameRoom } from './game-room.entity';

export enum GamePhase {
  WAITING = 'waiting',
  DEALING = 'dealing',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export enum CardSuit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  SPADES = 'spades',
  FLOWERS = 'flowers',
}

export enum CardValue {
  ACE = 'ace',
  TWO = 'two',
  THREE = 'three',
  FOUR = 'four',
  FIVE = 'five',
  SIX = 'six',
  SEVEN = 'seven',
  EIGHT = 'eight',
  NINE = 'nine',
  TEN = 'ten',
  JACK = 'jack',
  QUEEN = 'queen',
  KING = 'king',
  JOKER = 'joker',
}

export interface Card {
  id: string;
  suit: CardSuit;
  value: CardValue;
  isSpecial?: boolean;
}

export interface PlayerHand {
  playerId: string;
  cards: Card[];
  cardsCount: number;
}

@Entity('game_states')
export class GameState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => GameRoom, (room) => room.gameStates)
  @JoinColumn({ name: 'roomId' })
  room: GameRoom;

  @Column({ type: 'enum', enum: GamePhase, default: GamePhase.WAITING })
  phase: GamePhase;

  @Column()
  currentPlayerId: string;

  @Column({ type: 'jsonb', default: [] })
  playerOrder: string[];

  @Column({ type: 'jsonb', default: [] })
  playerHands: PlayerHand[];

  @Column({ type: 'jsonb', default: [] })
  discardPile: Card[];

  @Column({ type: 'jsonb', default: [] })
  drawPile: Card[];

  @Column({ type: 'jsonb', nullable: true })
  lastPlayedCard?: Card;

  @Column({ default: 1 })
  direction: number; // 1 for clockwise, -1 for counterclockwise

  @Column({ default: 0 })
  consecutiveDraws: number;

  @Column({ default: 0 })
  attackStack: number;

  @Column({ type: 'jsonb', default: {} })
  gameSettings: Record<string, any>;

  @Column({ nullable: true })
  winnerId?: string;

  @Column({ default: 0 })
  turnCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}