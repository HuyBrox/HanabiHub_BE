import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request interface
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
  };
}

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  timestamp: string;
}

// User related interfaces
export interface IUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isOnline: boolean;
  gamesPlayed: number;
  gamesWon: number;
}

// Game related interfaces
export interface ICard {
  id: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'white';
  number: 1 | 2 | 3 | 4 | 5;
}

export interface IPlayer {
  id: string;
  username: string;
  hand: ICard[];
  joinedAt: Date;
}

export interface IFireworks {
  red: number;
  yellow: number;
  green: number;
  blue: number;
  white: number;
}

export interface IGame {
  id: string;
  roomId: string;
  players: IPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  currentPlayer: number;
  deck: ICard[];
  discardPile: ICard[];
  fireworks: IFireworks;
  hints: number;
  lives: number;
  score: number;
  gameLog: any[];
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

// JWT Payload
export interface IJwtPayload extends JwtPayload {
  id: string;
  username: string;
  email?: string;
}

// Environment variables
export interface IEnvironmentVariables {
  PORT: string;
  NODE_ENV: string;
  JWT_SECRET?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  SOCKET_CORS_ORIGIN?: string;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'white';
export type CardNumber = 1 | 2 | 3 | 4 | 5;
