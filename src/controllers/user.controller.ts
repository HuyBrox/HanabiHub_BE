import { Request, Response } from 'express';
import User from '@models/user.model';
import { ApiResponse, UpdateUserRequest, IUser } from '../types';

// [GET] /api/users/:id - Lấy thông tin user
export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user: IUser | null = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// [PUT] /api/users/:id - Cập nhật thông tin user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updateData: UpdateUserRequest = req.body;

    const updatedUser: IUser | null = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};