//validators: dùng để validate dữ liệu đầu vào
//validate nghĩa là kiểm tra dữ liệu có đúng định dạng, kiểu dữ liệu, giá trị hợp lệ hay không
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

//validate dữ liệu đăng ký
export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email("Email không hợp lệ"),
      username: z
        .string()
        .min(3, "Tên người dùng phải có ít nhất 3 ký tự")
        .max(100, "Tên người dùng không được quá 100 ký tự"),
      password: z
        .string()
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
        .max(50, "Mật khẩu không được quá 50 ký tự"),
      confirmPassword: z
        .string()
        .min(6, "Xác nhận mật khẩu phải có ít nhất 6 ký tự"),
      fullname: z
        .string()
        .min(1, "Họ tên không được để trống")
        .max(200, "Họ tên không được quá 200 ký tự"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Xác nhận mật khẩu không khớp",
      path: ["confirmPassword"],
    }),
});

//validate dữ liệu đăng nhập
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .max(50, "Mật khẩu không được quá 50 ký tự"),
  }),
});

//validate dữ liệu cập nhật user
export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(100).optional(),
    // avatar có thể là URL string hoặc file upload (sẽ ở req.file)
    // Nếu là file upload thì không validate ở đây, chỉ validate khi là string
    avatar: z.union([z.string().url(), z.string()]).optional(),
    fullname: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
    isPrivate: z.boolean().optional(),
  }),
});

//Middleware để validate request
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Nếu có file upload (multer), bỏ qua validation avatar trong body
      const bodyToValidate = { ...req.body };
      if ((req as any).file && bodyToValidate.avatar) {
        delete bodyToValidate.avatar;
      }

      // Loại bỏ các field empty string trước khi validate (vì chúng là optional)
      Object.keys(bodyToValidate).forEach((key) => {
        if (bodyToValidate[key] === "" || bodyToValidate[key] === null) {
          delete bodyToValidate[key];
        }
      });

      schema.parse({
        body: bodyToValidate,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          data: error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
};
