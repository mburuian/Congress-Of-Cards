import { Injectable } from '@nestjs/common';

export interface Player {
  socketId: string;
  username: string;
}

export interface GameRoom {
  id: string;
  hostId: string;
  players: Player[];
}

@Injectable()
export class GameRoomService {
  private gameRooms: GameRoom[] = [];

  createRoom(roomId: string, hostId: string): GameRoom {
    const newRoom: GameRoom = {
      id: roomId,
      hostId,
      players: [],
    };
    this.gameRooms.push(newRoom);
    return newRoom;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.gameRooms.find(room => room.id === roomId);
  }

  findOne(roomId: string): GameRoom | undefined {
    return this.getRoom(roomId);
  }

  addPlayerToRoom(roomId: string, player: Player): GameRoom | undefined {
    const room = this.getRoom(roomId);
    if (room) {
      room.players.push(player);
      return room;
    }
    return undefined;
  }

  removePlayerFromRoom(roomId: string, socketId: string): GameRoom | undefined {
    const room = this.getRoom(roomId);
    if (room) {
      room.players = room.players.filter(p => p.socketId !== socketId);
      return room;
    }
    return undefined;
  }

  deleteRoom(roomId: string): void {
    this.gameRooms = this.gameRooms.filter(room => room.id !== roomId);
  }

  getAllRooms(): GameRoom[] {
    return this.gameRooms;
  }
}
