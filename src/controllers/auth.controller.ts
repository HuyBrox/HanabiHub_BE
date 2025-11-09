import { Request, Response } from "express";
import User from "../models/user.model";
import Otp from "../models/opt.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest, ApiResponse } from "../types";
// import { getReciverSocketIds, io } from "../socket/socket.js";
import { verifyOtp, sendOtp } from "../helpers/otp-genrator";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt";
import { OAuth2Client } from "google-auth-library";

// Đăng ký
export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      username,
      password,
      fullname,
      otp,
    }: {
      email: string;
      username: string;
      password: string;
      fullname: string;
      otp: string;
    } = req.body;

    // Kiểm tra OTP
    const isValidOtp = await verifyOtp(email, otp);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra email đã tồn tại (double check - đã check khi gửi OTP nhưng có thể có race condition)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email này đã được sử dụng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Tên người dùng này đã được sử dụng. Vui lòng chọn tên khác.",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo user mới
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      fullname,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công",
      data: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        fullname: newUser.fullname,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Sai thông tin đăng nhập",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra nếu user đăng nhập bằng Google (không có password)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message:
          "Tài khoản này đăng nhập bằng Google. Vui lòng sử dụng đăng nhập Google.",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Sai thông tin đăng nhập",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Tạo token pair (access + refresh)
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Set access token vào cookie "token" cho authentication
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000, // 15 phút cho access token
      path: "/",
    });

    // Gửi refresh token qua httpOnly cookie để bảo mật
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Chỉ gửi cookie qua HTTPS trong môi trường production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" cho cross-origin trong production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      path: "/", // Có thể truy cập từ tất cả các route
    });

    // Chỉ trả về access token và thông tin user (KHÔNG trả refresh token)
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullname: user.fullname,
          avatar: user.avatar,
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
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
        message: "Vui lòng cung cấp email và OTP!",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const isOtpValid = await verifyOtp(email, otp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn!",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "OTP hợp lệ! Bạn có thể tiếp tục đăng ký.",
      data: { verified: true, email },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi trong quá trình xác thực OTP.",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/user/sendOtp
export const sendOtpToEmail = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user?.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Gửi OTP qua email mà không trả lại OTP
    await sendOtp(user.email); // Gửi OTP và lưu vào cơ sở dữ liệu
    const [localPart, domain] = user.email.split("@"); // Tách phần tên và phần domain

    // Tạo phần ẩn với số lượng ký tự * dựa vào độ dài của localPart
    const maskedLocalPart =
      localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1);

    const maskedEmail = `${maskedLocalPart}@${domain}`; // Kết hợp lại

    return res.status(200).json({
      message: `OTP đã được gửi đến email ${maskedEmail}`,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi",
      success: false,
    });
  }
};
//[POST] gửi otp để đăng ký (chưa có tài khoản)
export const sendOtpToEmailRegister = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Kiểm tra email có được cung cấp
    if (!email) {
      return res.status(400).json({
        message: "Vui lòng nhập email",
        success: false,
      });
    }

    // Kiểm tra format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Email không hợp lệ",
        success: false,
      });
    }

    // Kiểm tra email đã tồn tại TRƯỚC KHI gửi OTP
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message:
          "Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.",
        success: false,
      });
    }

    // Email chưa tồn tại, gửi OTP
    await sendOtp(email); // Gửi OTP và lưu vào cơ sở dữ liệu

    return res.status(200).json({
      message: `OTP đã được gửi đến email ${email}`,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi",
      success: false,
    });
  }
};
// [PATCH] /api/user/changePassword
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user?.id;
    const { password, newPassword, otp } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "Người dùng không tồn tại",
        success: false,
      });
    }
    const email = user.email;

    // Kiểm tra nếu user đăng nhập bằng Google (không có password)
    if (!user.password) {
      return res.status(400).json({
        message: "Tài khoản này đăng nhập bằng Google. Không thể đổi mật khẩu.",
        success: false,
      });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Mật khẩu cũ không chính xác",
        success: false,
      });
    }

    // Kiểm tra OTP
    const isOTP = await verifyOtp(email, otp);
    if (!isOTP) {
      return res.status(400).json({
        message: "OTP không hợp lệ",
        success: false,
        passwordSuccess: true,
      });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // TODO: Tạm thời comment phần socket và notification
    //Tạo thông báo hệ thống
    // const receiverSocketIds = getReciverSocketIds(id);
    // io.to(receiverSocketIds).emit("system", {
    //     sender: "Hệ thống",
    //     message: "Bạn đã thay đổi mật khẩu lúc " + new Date().toLocaleString(),
    // });
    //Lưu thông báo vào db:
    // const notification = new Notification({
    //     sender: "Hệ thống",
    //     receiver: id,
    //     type: "system",
    //     content: "Bạn đã thay đổi mật khẩu lúc " + new Date().toLocaleString(),
    // });
    // await notification.save();

    return res.status(200).json({
      message: "Đổi mật khẩu thành công",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Xảy ra lỗi",
      success: false,
    });
  }
};

// [POST] Refresh Access Token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Lấy refresh token từ cookie thay vì request body
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy refresh token",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Verify refresh token (chỉ check JWT signature)
    const decoded = verifyRefreshToken(refreshToken);

    // Tìm user để tạo token mới
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Tạo token pair mới
    const tokens = generateTokenPair(user);

    // Set access token mới vào cookie
    res.cookie("token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000, // 15 phút
      path: "/",
    });

    // Gửi refresh token mới qua cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: tokens.accessToken,
        // Không trả refresh token trong response body
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] Logout All Devices - xóa refresh token khỏi database (logout tất cả thiết bị)
export const logoutAllDevices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xóa refresh token khỏi database (logout tất cả thiết bị)
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
    });

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout from all devices successful",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Logout all devices error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] Logout Current Device - chỉ invalidate token hiện tại
export const logoutCurrentDevice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const refreshToken = req.cookies?.refreshToken; // Lấy từ cookie thay vì body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Chỉ cần clear cookies, không cần check DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Chỉ clear cookies, không cần update DB
    // Access token sẽ tự hết hạn sau 15 phút

    // Clear access token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout from current device successful",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Logout current device error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Google OAuth2 Login
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken, accessToken: googleAccessToken } = req.body;

    if (!idToken && !googleAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token or access token is required",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    let payload: any = null;
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"
    );

    // Nếu có idToken, verify ID token
    if (idToken) {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
      });
      payload = ticket.getPayload();
    }
    // Nếu có googleAccessToken, lấy user info từ Google API
    else if (googleAccessToken) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${googleAccessToken}`
        );
        if (!response.ok) {
          throw new Error("Invalid access token");
        }
        const userInfo = (await response.json()) as {
          id: string;
          email: string;
          name: string;
          picture: string;
        };
        payload = {
          sub: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google access token",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not provided by Google",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Tìm user theo email trước (ưu tiên email vì nó là unique và quan trọng hơn)
    // Nếu user đã đăng ký bằng email/password, sẽ link Google account với tài khoản đó
    let user = await User.findOne({ email });

    if (user) {
      // User đã tồn tại với email này
      // Nếu chưa có googleId, link Google account với tài khoản này
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.avatar = picture;
        await user.save();
      }
      // Nếu đã có googleId nhưng khác với googleId hiện tại → có thể là tài khoản khác
      // Nhưng vì email đã match, nên vẫn dùng tài khoản này
      else if (user.googleId !== googleId) {
        // Cập nhật googleId mới (trường hợp user đổi Google account)
        user.googleId = googleId;
        if (picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // Không tìm thấy user theo email, kiểm tra xem có user nào đã dùng googleId này chưa
      const existingGoogleUser = await User.findOne({ googleId });
      if (existingGoogleUser) {
        // Đã có user với googleId này nhưng email khác → dùng tài khoản đó
        user = existingGoogleUser;
        // Cập nhật email nếu cần (trường hợp user đổi email trên Google)
        if (user.email !== email) {
          user.email = email;
        }
        if (picture) user.avatar = picture;
        await user.save();
      } else {
        // Tạo user mới
        // Tạo username từ email (lấy phần trước @)
        const baseUsername = email.split("@")[0];
        let username = baseUsername;
        let counter = 1;

        // Đảm bảo username unique
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        user = new User({
          email,
          googleId,
          fullname: name || email.split("@")[0],
          username,
          avatar: picture,
          password: undefined, // Không có password cho Google user
        });

        await user.save();
      }
    }

    // Tạo token pair (access + refresh)
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Set access token vào cookie "token" cho authentication
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000, // 15 phút cho access token
      path: "/",
    });

    // Gửi refresh token qua httpOnly cookie để bảo mật
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      path: "/",
    });

    // Trả về access token và thông tin user
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullname: user.fullname,
          avatar: user.avatar,
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
