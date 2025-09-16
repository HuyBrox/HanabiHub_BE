import { Response } from "express";
import User from "../models/user.model";
import { ApiResponse, IUser, AuthRequest } from "../types";
import { uploadImage } from "../helpers/upload-media";

// [GET] /api/users/me - Lấy thông tin user hiện tại
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user: IUser | null = await User.findOne({
      _id: userId,
      deleted: false,
    }).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    return res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: user,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/users/:id - Lấy thông tin user theo id
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const user: IUser | null = await User.findOne({
      _id: userId,
      deleted: false,
    }).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    return res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: user,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/users?page=1&limit=10 - Lấy danh sách user (phân trang)
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ deleted: false })
      .select("-password")
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments({ deleted: false });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách người dùng thành công",
      data: { users, total, page, limit },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/users/ - Cập nhật thông tin user hiện tại
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    // Chỉ lấy các trường hợp hợp lệ từ body (trừ avatar)
    const updateFields: Record<string, any> = {};
    const allowedFields = [
      "email",
      "fullname",
      "gender",
      "bio",
      "phone",
      "address",
      "level",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    // Xử lý avatar từ req.file nếu có và chỉ cho phép ảnh
    const avatarFile = req.file;
    if (avatarFile && avatarFile.mimetype.startsWith("image/")) {
      updateFields.avatar = await uploadImage({ buffer: avatarFile.buffer });
    }

    const updatedUser: IUser | null = await User.findOneAndUpdate(
      { _id: userId, deleted: false },
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: updatedUser,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/users/ - Xóa user hiện tại
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const deletedUser = await User.findOneAndUpdate(
      { _id: userId, deleted: false },
      { deleted: true },
      { new: true }
    ).select("-password");
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    return res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công (soft delete)",
      data: deletedUser,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
// //[POST] /api/users/change-avatar/:id - Sửa avatar user hiện tại
// export const changeAvatar = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { avatar } = req.files;
//     if (!avatar) {
//       return res.status(400).json({
//         success: false,
//         message: "Yêu cầu avatar mới",
//         data: null,
//         timestamp: new Date().toISOString(),
//       } as ApiResponse);
//     }

//     const updatedUser = await User.findOneAndUpdate(
//       { _id: userId, deleted: false },
//       { avatar },
//       { new: true, runValidators: true }
//     ).select("-password");

//     if (!updatedUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//         data: null,
//         timestamp: new Date().toISOString(),
//       } as ApiResponse);
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Avatar updated successfully",
//       data: updatedUser,
//       timestamp: new Date().toISOString(),
//     } as ApiResponse);
//   } catch (error) {
//     console.error("Error changing avatar:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       data: null,
//       timestamp: new Date().toISOString(),
//     } as ApiResponse);
//   }
// };
