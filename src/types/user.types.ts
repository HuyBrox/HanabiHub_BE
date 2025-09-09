//định nghĩa ra các kiểu dùng trong từng controller để quản lý chặc chẽ hơn
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: string;
}
