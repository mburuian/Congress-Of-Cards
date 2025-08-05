import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameState, GamePhase, Card, CardSuit, CardValue, PlayerHand } from '../entities/game-state.entity';
import { GameRoom, GameRoomStatus } from '../entities/game-room.entity';
import { GameHistory, MoveType } from '../entities/game-history.entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameState)
    private gameStateRepo: Repository<GameState>,
    @InjectRepository(GameRoom)
    private gameRoomRepo: Repository<GameRoom>,
    @InjectRepository(GameHistory)
    private gameHistoryRepo: Repository<GameHistory>,
  ) {}

  async createDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    const suits = Object.values(CardSuit);
    const values = Object.values(CardValue);

    // Create standard cards
    for (const suit of suits) {
      for (const value of values) {
        if (value !== CardValue.JOKER) {
          deck.push({
            id: `${suit}-${value}`,
            suit,
            value,
            isSpecial: this.isSpecialCard(value),
          });
        }
      }
    }

    // Add jokers
    deck.push(
      { id: 'joker-1', suit: CardSuit.HEARTS, value: CardValue.JOKER, isSpecial: true },
      { id: 'joker-2', suit: CardSuit.SPADES, value: CardValue.JOKER, isSpecial: true },
    );

    return this.shuffleDeck(deck);
  }

  private isSpecialCard(value: CardValue): boolean {
    return [CardValue.ACE, CardValue.TWO, CardValue.THREE, CardValue.EIGHT, CardValue.KING, CardValue.JOKER].includes(value);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async startGame(roomId: string): Promise<GameState> {
    const room = await this.gameRoomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new BadRequestException('Room not found');

    const deck = await this.createDeck();
    const playerHands: PlayerHand[] = [];
    const cardsPerPlayer = 7;

    // Deal cards to players
    for (let i = 0; i < room.playerIds.length; i++) {
      const playerId = room.playerIds[i];
      const hand: Card[] = [];
      
      for (let j = 0; j < cardsPerPlayer; j++) {
        const card = deck.pop();
        if (card) hand.push(card);
      }
      
      playerHands.push({
        playerId,
        cards: hand,
        cardsCount: hand.length,
      });
    }

    // Set up initial discard pile
    const firstCard = deck.pop();
    const discardPile = firstCard ? [firstCard] : [];

    const gameState = this.gameStateRepo.create({
      roomId,
      phase: GamePhase.PLAYING,
      currentPlayerId: room.playerIds[0],
      playerOrder: [...room.playerIds],
      playerHands,
      discardPile,
      drawPile: deck,
      lastPlayedCard: firstCard,
      direction: 1,
      consecutiveDraws: 0,
      attackStack: 0,
      turnCount: 1,
    });

    await this.gameStateRepo.save(gameState);
    
    // Update room status
    room.status = GameRoomStatus.IN_PROGRESS;
    await this.gameRoomRepo.save(room);

    return gameState;
  }

  async playCard(gameStateId: string, playerId: string, cardId: string): Promise<GameState> {
    const gameState = await this.gameStateRepo.findOne({ where: { id: gameStateId } });
    if (!gameState) throw new BadRequestException('Game state not found');

    if (gameState.currentPlayerId !== playerId) {
      throw new BadRequestException('Not your turn');
    }

    const playerHand = gameState.playerHands.find(h => h.playerId === playerId);
    if (!playerHand) throw new BadRequestException('Player hand not found');

    const cardIndex = playerHand.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new BadRequestException('Card not in hand');

    const card = playerHand.cards[cardIndex];
    
    // Validate card can be played
    if (!this.canPlayCard(card, gameState.lastPlayedCard, gameState.attackStack)) {
      throw new BadRequestException('Invalid card play');
    }

    // Remove card from hand
    playerHand.cards.splice(cardIndex, 1);
    playerHand.cardsCount = playerHand.cards.length;

    // Add card to discard pile
    gameState.discardPile.push(card);
    gameState.lastPlayedCard = card;

    // Apply card effects
    await this.applyCardEffects(gameState, card, playerId);

    // Check for win condition
    if (playerHand.cardsCount === 0) {
      gameState.winnerId = playerId;
      gameState.phase = GamePhase.FINISHED;
    } else {
      // Move to next player
      this.moveToNextPlayer(gameState);
    }

    gameState.turnCount++;
    await this.gameStateRepo.save(gameState);

    // Record move in history
    await this.recordMove(gameState.roomId, playerId, MoveType.PLAY_CARD, { cardId, card });

    return gameState;
  }

  private canPlayCard(card: Card, lastCard: Card | undefined, attackStack: number): boolean {
    if (!lastCard) return true;
    
    // If under attack, can only play attack cards or matching suit/value
    if (attackStack > 0) {
      return this.isAttackCard(card) || card.suit === lastCard.suit || card.value === lastCard.value;
    }

    // Wild cards (Aces) can always be played
    if (card.value === CardValue.ACE) return true;

    // Must match suit or value
    return card.suit === lastCard.suit || card.value === lastCard.value;
  }

  private isAttackCard(card: Card): boolean {
    return [CardValue.TWO, CardValue.THREE, CardValue.JOKER].includes(card.value);
  }

  private async applyCardEffects(gameState: GameState, card: Card, playerId: string): Promise<void> {
    switch (card.value) {
      case CardValue.TWO:
        gameState.attackStack += 2;
        break;
      case CardValue.THREE:
        gameState.attackStack += 3;
        break;
      case CardValue.JOKER:
        gameState.attackStack += 5;
        break;
      case CardValue.EIGHT:
        // Skip next player
        this.moveToNextPlayer(gameState);
        break;
      case CardValue.KING:
        // Reverse direction
        gameState.direction *= -1;
        break;
    }
  }

  private moveToNextPlayer(gameState: GameState): void {
    const currentIndex = gameState.playerOrder.indexOf(gameState.currentPlayerId);
    const nextIndex = (currentIndex + gameState.direction + gameState.playerOrder.length) % gameState.playerOrder.length;
    gameState.currentPlayerId = gameState.playerOrder[nextIndex];
  }

  async drawCard(gameStateId: string, playerId: string): Promise<GameState> {
    const gameState = await this.gameStateRepo.findOne({ where: { id: gameStateId } });
    if (!gameState) throw new BadRequestException('Game state not found');

    if (gameState.currentPlayerId !== playerId) {
      throw new BadRequestException('Not your turn');
    }

    const playerHand = gameState.playerHands.find(h => h.playerId === playerId);
    if (!playerHand) throw new BadRequestException('Player hand not found');

    // Draw cards (including attack stack)
    const cardsToDraw = Math.max(1, gameState.attackStack);
    
    for (let i = 0; i < cardsToDraw; i++) {
      if (gameState.drawPile.length === 0) {
        // Reshuffle discard pile except top card
        const topCard = gameState.discardPile.pop();
        gameState.drawPile = this.shuffleDeck([...gameState.discardPile]);
        gameState.discardPile = topCard ? [topCard] : [];
      }

      const card = gameState.drawPile.pop();
      if (card) {
        playerHand.cards.push(card);
        playerHand.cardsCount++;
      }
    }

    // Reset attack stack
    gameState.attackStack = 0;
    
    // Move to next player
    this.moveToNextPlayer(gameState);
    
    gameState.turnCount++;
    await this.gameStateRepo.save(gameState);

    // Record move in history
    await this.recordMove(gameState.roomId, playerId, MoveType.DRAW_CARD, { cardsDrawn: cardsToDraw });

    return gameState;
  }

  private async recordMove(roomId: string, playerId: string, moveType: MoveType, moveData?: Record<string, any>): Promise<void> {
    const gameHistory = this.gameHistoryRepo.create({
      roomId,
      playerId,
      moveType,
      moveData,
      turnNumber: 0, // Will be set based on current game state
    });

    await this.gameHistoryRepo.save(gameHistory);
  }

  async getGameState(roomId: string): Promise<GameState | null> {
    return await this.gameStateRepo.findOne({ 
      where: { roomId },
      order: { createdAt: 'DESC' }
    });
  }
}