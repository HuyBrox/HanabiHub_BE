import { Request, Response } from 'express';
import User from '@models/user.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest, ApiResponse, LoginRequest, CreateUserRequest } from '../types';

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