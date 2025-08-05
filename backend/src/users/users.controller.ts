import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '/auth/jwt-auth.guard';
import { UsersService, UpdateUserDto } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() updateUserDto: UpdateUserDto, @Request() req) {
    return await this.usersService.update(req.user.userId, updateUserDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req) {
    return await this.usersService.getUserStats(req.user.userId);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return await this.usersService.getLeaderboard();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }
}