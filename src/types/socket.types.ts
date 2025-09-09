export interface SocketUser {
  id: string;
  username: string;
  socketId: string;
}

export interface SocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}
