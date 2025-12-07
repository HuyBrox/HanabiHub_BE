import { Response } from "express";
import User from "../models/user.model";
import UserActivity from "../models/user-activity.model";
import UserCourseProgress from "../models/user-course-progress.model";
import Course from "../models/course.model";
import { ApiResponse, IUser, AuthRequest } from "../types";
import { uploadImage } from "../helpers/upload-media";
import Bycrypt from "bcryptjs";
import { verifyOtp } from "../helpers/otp-genrator";
import mongoose from "mongoose";

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

// [GET] /api/user/profile/:id - Lấy thông tin user theo id
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    const user: IUser | null = await User.findOne({
      _id: targetUserId,
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

    const isOwnProfile = currentUserId === targetUserId;

    // Kiểm tra follow status
    const isFollowing = currentUserId
      ? user.followers.some(
          (followerId) => followerId.toString() === currentUserId
        )
      : false;

    // Kiểm tra mutual follow (bạn bè)
    let isFriend = false;
    let canViewPosts = true; // Mặc định có thể xem posts
    let canMessage = false; // Mặc định không thể nhắn tin

    if (currentUserId && !isOwnProfile) {
      const currentUser = await User.findById(currentUserId);
      if (currentUser) {
        const isCurrentUserFollowingTarget = user.followers.some(
          (followerId) => followerId.toString() === currentUserId
        );
        const isTargetFollowingCurrentUser = currentUser.followers.some(
          (followerId) => followerId.toString() === targetUserId
        );

        isFriend = isCurrentUserFollowingTarget && isTargetFollowingCurrentUser;

        // Quyền xem posts
        if (user.isPrivate) {
          // Nếu profile private, chỉ bạn bè mới xem được posts
          canViewPosts = isFriend;
        } else {
          // Nếu profile public, ai cũng xem được
          canViewPosts = true;
        }

        // Quyền nhắn tin: chỉ khi đã follow (không cần mutual)
        canMessage = isFollowing;
      }
    } else if (isOwnProfile) {
      // Nếu là profile của chính mình
      canViewPosts = true;
      canMessage = false; // Không thể nhắn tin cho chính mình
    }

    // Populate followers và following để lấy số lượng
    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: {
        ...user.toObject(),
        followersCount,
        followingCount,
        isFollowing,
        isFriend,
        canViewPosts,
        canMessage,
        isOwnProfile,
      },
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

// [GET] /api/user/search?q=keyword - Tìm kiếm user
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        message: "Tìm kiếm người dùng thành công",
        data: [],
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const searchRegex = new RegExp(query, "i");
    const users = await User.find({
      deleted: false,
      $or: [
        { username: searchRegex },
        { fullname: searchRegex },
        { email: searchRegex },
      ],
    })
      .select("-password")
      .limit(20)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Tìm kiếm người dùng thành công",
      data: users,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/user/:id/follow - Follow user
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Không thể follow chính mình",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const isAlreadyFollowing = targetUser.followers.some(
      (followerId) => followerId.toString() === currentUserId
    );

    if (isAlreadyFollowing) {
      return res.status(400).json({
        success: false,
        message: "Đã follow người dùng này",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Follow: Thêm currentUserId vào targetUser.followers và targetUserId vào currentUser.following
    if (!targetUser.followers.includes(currentUserId as any)) {
      targetUser.followers.push(currentUserId as any);
    }
    if (!currentUser.following.includes(targetUserId as any)) {
      currentUser.following.push(targetUserId as any);
    }

    await Promise.all([targetUser.save(), currentUser.save()]);

    // Kiểm tra mutual follow (bạn bè)
    const isMutualFollow =
      targetUser.followers.some(
        (followerId) => followerId.toString() === currentUserId
      ) &&
      currentUser.followers.some(
        (followerId) => followerId.toString() === targetUserId
      );

    return res.status(200).json({
      success: true,
      message: "Đã theo dõi",
      data: {
        isFollowing: true,
        isFriend: isMutualFollow,
        followersCount: targetUser.followers.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error following user:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/user/:id/follow - Unfollow user
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Không thể unfollow chính mình",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const isFollowing = targetUser.followers.some(
      (followerId) => followerId.toString() === currentUserId
    );

    if (!isFollowing) {
      return res.status(400).json({
        success: false,
        message: "Chưa follow người dùng này",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Unfollow: Xóa currentUserId khỏi targetUser.followers và targetUserId khỏi currentUser.following
    targetUser.followers = targetUser.followers.filter(
      (followerId) => followerId.toString() !== currentUserId
    );
    currentUser.following = currentUser.following.filter(
      (followingId) => followingId.toString() !== targetUserId
    );

    await Promise.all([targetUser.save(), currentUser.save()]);

    return res.status(200).json({
      success: true,
      message: "Đã bỏ theo dõi",
      data: {
        isFollowing: false,
        isFriend: false, // Khi unfollow thì không còn là bạn bè
        followersCount: targetUser.followers.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error unfollowing user:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/friends/:id - Lấy danh sách bạn bè của user
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
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

    // Lấy danh sách followers và following
    const followers = await User.find({
      _id: { $in: user.followers },
      deleted: false,
    }).select("-password -email -phone");

    const following = await User.find({
      _id: { $in: user.following },
      deleted: false,
    }).select("-password -email -phone");

    // Tìm mutual follow (bạn bè): những người vừa follow user và user cũng follow họ
    const friends = followers.filter((follower) =>
      user.following.some(
        (followingId) => followingId.toString() === follower._id.toString()
      )
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách bạn bè thành công",
      data: {
        friends: friends.map((friend) => ({
          _id: friend._id,
          fullname: friend.fullname,
          username: friend.username,
          avatar: friend.avatar,
          bio: friend.bio,
          isOnline: friend.isOnline,
          lastActiveAt: friend.lastActiveAt,
        })),
        total: friends.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error getting friends:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/friends/me - Lấy danh sách bạn bè của current user (dùng cho ChatDock)
export const getMyFriends = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Lấy danh sách followers và following
    const followers = await User.find({
      _id: { $in: currentUser.followers },
      deleted: false,
    }).select("-password -email -phone");

    const following = await User.find({
      _id: { $in: currentUser.following },
      deleted: false,
    }).select("-password -email -phone");

    // Tìm mutual follow (bạn bè)
    const friends = followers.filter((follower) =>
      currentUser.following.some(
        (followingId) => followingId.toString() === follower._id.toString()
      )
    );

    // Sort: online first, then by lastActiveAt
    const sortedFriends = friends.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      );
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách bạn bè thành công",
      data: {
        friends: sortedFriends.map((friend) => ({
          _id: friend._id,
          fullname: friend.fullname,
          username: friend.username,
          avatar: friend.avatar,
          bio: friend.bio,
          isOnline: friend.isOnline,
          lastActiveAt: friend.lastActiveAt,
        })),
        total: sortedFriends.length,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error getting my friends:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PATCH] /api/user/change-profile - Cập nhật thông tin user hiện tại
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

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
      "isPrivate",
    ];
    allowedFields.forEach((field) => {
      // isPrivate là boolean nên cần xử lý riêng (từ FormData là string "true"/"false")
      if (field === "isPrivate" && req.body[field] !== undefined) {
        updateFields[field] = req.body[field] === "true" || req.body[field] === true;
      } else if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
        updateFields[field] = req.body[field];
      }
    });

    // Xử lý avatar từ req.file nếu có và chỉ cho phép ảnh
    const avatarFile = req.file;
    if (avatarFile && avatarFile.mimetype.startsWith("image/")) {
      updateFields.avatar = await uploadImage({ buffer: avatarFile.buffer });
    }

    // Nếu không có field nào để update
    if (Object.keys(updateFields).length === 0) {
      const currentUser = await User.findById(userId).select("-password");
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
      return res.status(200).json({
        success: true,
        message: "Không có thay đổi nào",
        data: currentUser,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Lỗi máy chủ nội bộ",
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
    // Kiểm tra nếu user đăng nhập bằng Google (không có password)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Tài khoản này đăng nhập bằng Google. Không thể đổi mật khẩu. Vui lòng đặt mật khẩu mới.",
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

// [GET] /api/user/profile/stats - Lấy thống kê tổng quan của user
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Lấy user activity (tạo mới nếu chưa có)
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    let activity = await UserActivity.findOne({ userId: userIdObjectId });
    if (!activity) {
      try {
        activity = new UserActivity({
          userId: userIdObjectId,
          courseActivities: [],
          lessonActivities: [],
          flashcardSessions: [],
          cardLearning: [],
          dailyLearning: [],
          studyPreferences: {
            dailyGoal: 30,
            studyReminder: {
              enabled: false,
            },
          },
        });
        await activity.save();
      } catch (saveError: any) {
        throw new Error(`Failed to create UserActivity: ${saveError?.message}`);
      }
    }

    // Tính toán stats
    const wordsLearned = activity?.cardLearning?.filter(
      (card: any) => card.masteryLevel === "mastered"
    ).length || 0;

    const kanjiMastered = activity?.cardLearning?.filter(
      (card: any) => card.masteryLevel === "mastered"
    ).length || 0;

    const lessonsCompleted = activity?.lessonActivities?.filter(
      (lesson: any) => lesson.isCompleted
    ).length || 0;

    // Tính study streak từ dailyLearning
    let studyStreak = 0;
    if (activity?.dailyLearning && activity.dailyLearning.length > 0) {
      const sortedDays = activity.dailyLearning
        .map((day: any) => new Date(day.date))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime());

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedDays.length; i++) {
        const day = new Date(sortedDays[i]);
        day.setHours(0, 0, 0, 0);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (day.getTime() === expectedDate.getTime()) {
          studyStreak++;
        } else {
          break;
        }
      }
    }

    // Tính total study time
    const totalStudyTime = activity?.dailyLearning?.reduce(
      (sum: number, day: any) => sum + (day.totalStudyTime || 0),
      0
    ) || 0;
    const totalStudyTimeHours = Math.round((totalStudyTime / 3600) * 10) / 10;

    // Format join date
    const joinDate = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "Unknown";

    return res.status(200).json({
      success: true,
      message: "Get user stats successfully",
      data: {
        name: user.fullname || user.username,
        username: `@${user.username}`,
        avatar: user.avatar,
        jlptLevel: user.level || "N5",
        joinDate,
        studyStreak,
        totalStudyTime: totalStudyTimeHours,
        wordsLearned,
        kanjiMastered,
        lessonsCompleted,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/profile/courses - Lấy danh sách courses đã enroll với progress
export const getUserCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Lấy tất cả course progress của user
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const courseProgresses = await UserCourseProgress.find({ userId: userIdObjectId })
      .populate("courseId", "title thumbnail")
      .sort({ updatedAt: -1 });

    const courses = await Promise.all(
      courseProgresses.map(async (progress: any) => {
        const course = await Course.findById(progress.courseId).select(
          "title thumbnail"
        );
        if (!course) return null;

        return {
          id: course._id.toString(),
          title: course.title,
          progress: progress.progressPercentage || 0,
          status:
            progress.status === "completed"
              ? "completed"
              : progress.status === "in_progress"
              ? "in-progress"
              : "not-started",
          image: course.thumbnail || "/images/placeholders/placeholder.svg",
        };
      })
    );

    // Filter out null values
    const validCourses = courses.filter((c) => c !== null);

    return res.status(200).json({
      success: true,
      message: "Get user courses successfully",
      data: validCourses,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/profile/weekly-progress - Lấy thống kê học tập theo tuần
export const getWeeklyProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    let activity = await UserActivity.findOne({ userId: userIdObjectId });
    if (!activity) {
      try {
        activity = new UserActivity({
          userId: userIdObjectId,
          courseActivities: [],
          lessonActivities: [],
          flashcardSessions: [],
          cardLearning: [],
          dailyLearning: [],
          studyPreferences: {
            dailyGoal: 30,
            studyReminder: {
              enabled: false,
            },
          },
        });
        await activity.save();
      } catch (saveError: any) {
        throw new Error(`Failed to create UserActivity: ${saveError?.message}`);
      }
    }

    if (!activity.dailyLearning) {
      // Trả về dữ liệu mặc định cho 7 ngày
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return res.status(200).json({
        success: true,
        message: "Get weekly progress successfully",
        data: days.map((day) => ({ day, hours: 0 })),
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Lấy 7 ngày gần nhất
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const recentDays = activity.dailyLearning
      .filter((day: any) => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate >= sevenDaysAgo && dayDate <= today;
      })
      .map((day: any) => ({
        date: new Date(day.date),
        hours: (day.totalStudyTime || 0) / 3600,
      }))
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // Tạo map cho 7 ngày
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData: { day: string; hours: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dayName = dayNames[date.getDay()];
      const dayData = recentDays.find(
        (d: any) =>
          d.date.toDateString() === date.toDateString()
      );
      weeklyData.push({
        day: dayName,
        hours: dayData ? Math.round(dayData.hours * 10) / 10 : 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get weekly progress successfully",
      data: weeklyData,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/profile/achievements - Lấy danh sách achievements
export const getUserAchievements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    let activity = await UserActivity.findOne({ userId: userIdObjectId });
    if (!activity) {
      try {
        activity = new UserActivity({
          userId: userIdObjectId,
          courseActivities: [],
          lessonActivities: [],
          flashcardSessions: [],
          cardLearning: [],
          dailyLearning: [],
          studyPreferences: {
            dailyGoal: 30,
            studyReminder: {
              enabled: false,
            },
          },
        });
        await activity.save();
      } catch (saveError: any) {
        throw new Error(`Failed to create UserActivity: ${saveError?.message}`);
      }
    }

    const lessonsCompleted = activity?.lessonActivities?.filter(
      (l: any) => l.isCompleted
    ).length || 0;
    const kanjiMastered = activity?.cardLearning?.filter(
      (c: any) => c.masteryLevel === "mastered"
    ).length || 0;
    const studyStreak = activity?.dailyLearning?.[0]?.streakDays || 0;

    // Define achievements
    const achievements = [
      {
        id: 1,
        title: "First Steps",
        description: "Complete your first lesson",
        icon: "🎯",
        earned: lessonsCompleted >= 1,
        earnedDate: lessonsCompleted >= 1 ? new Date().toLocaleDateString() : undefined,
        progress: lessonsCompleted >= 1 ? 100 : Math.min((lessonsCompleted / 1) * 100, 100),
      },
      {
        id: 2,
        title: "Hiragana Master",
        description: "Master all 46 hiragana characters",
        icon: "🔤",
        earned: kanjiMastered >= 46,
        earnedDate: kanjiMastered >= 46 ? new Date().toLocaleDateString() : undefined,
        progress: kanjiMastered >= 46 ? 100 : Math.min((kanjiMastered / 46) * 100, 100),
      },
      {
        id: 3,
        title: "Study Streak",
        description: "Study for 30 consecutive days",
        icon: "🔥",
        earned: studyStreak >= 30,
        earnedDate: studyStreak >= 30 ? new Date().toLocaleDateString() : undefined,
        progress: studyStreak >= 30 ? 100 : Math.min((studyStreak / 30) * 100, 100),
      },
      {
        id: 4,
        title: "Kanji Collector",
        description: "Learn 100 kanji characters",
        icon: "📚",
        earned: kanjiMastered >= 100,
        earnedDate: kanjiMastered >= 100 ? new Date().toLocaleDateString() : undefined,
        progress: kanjiMastered >= 100 ? 100 : Math.min((kanjiMastered / 100) * 100, 100),
      },
      {
        id: 5,
        title: "Community Helper",
        description: "Help 10 fellow learners",
        icon: "🤝",
        earned: false,
        progress: 0,
      },
      {
        id: 6,
        title: "JLPT Ready",
        description: "Complete N4 preparation course",
        icon: "🎓",
        earned: lessonsCompleted >= 50,
        earnedDate: lessonsCompleted >= 50 ? new Date().toLocaleDateString() : undefined,
        progress: lessonsCompleted >= 50 ? 100 : Math.min((lessonsCompleted / 50) * 100, 100),
      },
    ];

    return res.status(200).json({
      success: true,
      message: "Get achievements successfully",
      data: achievements,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/user/profile/insights - Lấy study insights
export const getUserInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    let activity = await UserActivity.findOne({ userId: userIdObjectId });
    if (!activity) {
      try {
        activity = new UserActivity({
          userId: userIdObjectId,
          courseActivities: [],
          lessonActivities: [],
          flashcardSessions: [],
          cardLearning: [],
          dailyLearning: [],
          studyPreferences: {
            dailyGoal: 30,
            studyReminder: {
              enabled: false,
            },
          },
        });
        await activity.save();
      } catch (saveError: any) {
        throw new Error(`Failed to create UserActivity: ${saveError?.message}`);
      }
    }

    if (!activity.dailyLearning || activity.dailyLearning.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Get insights successfully",
        data: {
          mostActiveDay: "N/A",
          averageSession: "0 minutes",
          favoriteCategory: "N/A",
          nextMilestone: "Start learning",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Tính most active day
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayStats: { [key: string]: number } = {};

    activity.dailyLearning.forEach((day: any) => {
      const date = new Date(day.date);
      const dayName = dayNames[date.getDay()];
      dayStats[dayName] = (dayStats[dayName] || 0) + (day.totalStudyTime || 0);
    });

    const mostActiveDay = Object.keys(dayStats).length > 0
      ? Object.keys(dayStats).reduce((a, b) =>
          dayStats[a] > dayStats[b] ? a : b
        )
      : "N/A";

    // Tính average session
    const totalSessions = activity.lessonActivities?.length || 0;
    const totalTime = activity.dailyLearning.reduce(
      (sum: number, day: any) => sum + (day.totalStudyTime || 0),
      0
    );
    const avgMinutes = totalSessions > 0 ? Math.round(totalTime / totalSessions / 60) : 0;
    const averageSession = `${avgMinutes} minutes`;

    // Favorite category
    const favoriteCategory = "Kanji";

    // Next milestone
    const kanjiMastered = activity.cardLearning?.filter(
      (c: any) => c.masteryLevel === "mastered"
    ).length || 0;
    const nextMilestone = kanjiMastered < 100 ? "100 Kanji" : "200 Kanji";

    return res.status(200).json({
      success: true,
      message: "Get insights successfully",
      data: {
        mostActiveDay,
        averageSession,
        favoriteCategory,
        nextMilestone,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
