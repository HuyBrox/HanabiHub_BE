//validators: dùng để validate dữ liệu đầu vào
//validate nghĩa là kiểm tra dữ liệu có đúng định dạng, kiểu dữ liệu, giá trị hợp lệ hay không
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

//validate dữ liệu đăng ký
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Email không hợp lệ"),
    username: z.string().min(3, "Tên người dùng phải có ít nhất 3 ký tự").max(100, "Tên người dùng không được quá 100 ký tự"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").max(100, "Mật khẩu không được quá 100 ký tự")
  })
});

//validate dữ liệu đăng nhập
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(1, "Mật khẩu không được để trống")
  })
});

//validate dữ liệu cập nhật user
export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3, "Tên người dùng phải có ít nhất 3 ký tự").max(100, "Tên người dùng không được quá 100 ký tự").optional(),
    avatar: z.string().url("Avatar phải là URL hợp lệ").optional()
  }),
  params: z.object({
    id: z.string().min(1, "ID không hợp lệ")
  })
});

//Middleware để validate request
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          data: error.issues,
          timestamp: new Date().toISOString()
        });
        return;
      }
      next(error);
    }
  };
};
