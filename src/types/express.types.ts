import { Request } from 'express';

//cấu hình thêm thuộc tính user vào Request của express
// File và files sẽ được tự động thêm bởi multer middleware
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
    name: string;
  };
  // Multer adds file property, type sẽ được infer từ multer
  file?: Express.Multer.File | undefined;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
}
