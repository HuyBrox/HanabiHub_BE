import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface TokenPayload {
  id: string;
  email: string;
  isAdmin?: boolean;
}

export interface RefreshTokenPayload {
  id: string;
  email: string;
  tokenVersion?: number; // Để invalidate tokens khi cần
}

// Tạo Access Token (thời gian sống ngắn: 15 phút)
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'access-secret-key',
    {
      expiresIn: '15m' // 15 phút
    }
  );
};

// Tạo Refresh Token (thời gian sống dài: 7 ngày)
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    {
      expiresIn: '7d' // 7 ngày
    }
  );
};

// Verify Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'access-secret-key'
    ) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret-key'
    ) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Tạo cả 2 tokens cho user
export const generateTokenPair = (user: { _id: Types.ObjectId; email: string; isAdmin: boolean }) => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    isAdmin: user.isAdmin
  };

  const refreshPayload: RefreshTokenPayload = {
    id: user._id.toString(),
    email: user.email
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(refreshPayload);

  return {
    accessToken,
    refreshToken
  };
};
