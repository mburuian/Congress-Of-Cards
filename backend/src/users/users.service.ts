import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  level: number;
  experience: number;
}

@Injectable()
export class UsersService {
  private users: User[] = [];
  private idCounter = 1;

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async create(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const newUser: User = {
      id: this.idCounter++,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      level: 1,
      experience: 0,
    };
    this.users.push(newUser);
    return newUser;
  }
}
