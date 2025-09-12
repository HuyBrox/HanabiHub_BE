import { Request, Response } from 'express';
import User from '@models/user.model';
import Otp from '@models/opt.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest, ApiResponse, LoginRequest, CreateUserRequest } from '../types';
// import { getReciverSocketIds, io } from "../socket/socket.js";

// Helper function để verify OTP
const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
  try {
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return false;
    }

    // Xóa OTP sau khi verify thành công
    await Otp.deleteOne({ _id: otpRecord._id });
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

// Đăng ký
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password }: CreateUserRequest = req.body;

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
        data: null,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo user mới
    const newUser = new User({
      email,
      username,
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: newUser._id, email: newUser.email, username: newUser.username },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    // Kiểm tra password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );


    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user._id, email: user.email, username: user.username }
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

export const verifyOtpForRegistration = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        // Validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp email và OTP!',
                data: null,
                timestamp: new Date().toISOString()
            } as ApiResponse);
        }

        const isOtpValid = await verifyOtp(email, otp);
        if (!isOtpValid) {
            return res.status(400).json({
                success: false,
                message: 'OTP không hợp lệ hoặc đã hết hạn!',
                data: null,
                timestamp: new Date().toISOString()
            } as ApiResponse);
        }

        return res.status(200).json({
            success: true,
            message: 'OTP hợp lệ! Bạn có thể tiếp tục đăng ký.',
            data: { verified: true, email },
            timestamp: new Date().toISOString()
        } as ApiResponse);

    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi trong quá trình xác thực OTP.',
            data: null,
            timestamp: new Date().toISOString()
        } as ApiResponse);
    }
};