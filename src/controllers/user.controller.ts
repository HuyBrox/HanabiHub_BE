import { Response } from "express";
import User from "../models/user.model";
import { ApiResponse, IUser, AuthRequest } from "../types";
import { uploadImage } from "../helpers/upload-media";
import Bycrypt from "bcryptjs";
import { verifyOtp } from "../helpers/otp-genrator";

// [GET] /api/user/profile - Lấy thông tin user hiện tại
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
    }).select("-password -email -phone");
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

// [GET] /api/user/getAll?page=1&limit=10 - Lấy danh sách user (phân trang)
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
      "username",
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
//[PATCH] /api/users/change-password - Đổi mật khẩu
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword, otp } = req.body;
    if (!currentPassword || !newPassword || !otp) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra mật khẩu hiện tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    // Verify OTP
    const isOtpValid = await verifyOtp(user.email, otp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    // Kiểm tra mật khẩu hiện tại
    const isMatch = await Bycrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    // Cập nhật mật khẩu mới
    user.password = await Bycrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /user/ - Xóa user hiện tại
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
// //[PATCH] /user/change-email - thay mail ( chỗ này gửi mail về mail cũ nhé dev fe)
export const changeEmail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const email = req.user?.email;
    const { newEmail, Otp } = req.body;
    if (!newEmail || !Otp) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    const isOtpValid = await Otp.verify(email, Otp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    // Kiểm tra email mới đã được sử dụng chưa
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    // Cập nhật email mới
    user.email = newEmail;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật email thành công",
      data: user,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error changing email:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
