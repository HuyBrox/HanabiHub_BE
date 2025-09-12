import { Request } from 'express';

//cấu hình thêm thuộc tính user vào Request của express
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
    name: string;
  };
}
