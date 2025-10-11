import { Request, Response } from "express";
import Post from "../models/post.model";
import { ApiResponse, IPost, AuthRequest } from "../types";
import { deleteMediaById, uploadImage } from "../helpers/upload-media";
//hàm create chưa có upload image
//update cugnx vậy (update ảnh khác nhớ xóa ảnh cũ trên cloudinary)
// [GET] /api/posts - Lấy tất cả posts (chưa phân trang)
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts: IPost[] = await Post.find()
      .populate("author", "fullname username avatar")
      .populate("comments")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Posts retrieved successfully",
      data: posts,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/posts/:id - Lấy thông tin post theo ID
export const getPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const post: IPost | null = await Post.findById(postId)
      .populate("author", "fullname username avatar")
      .populate("comments");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Post retrieved successfully",
      data: post,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/posts - Tạo post mới
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const createData: {
      title: string;
      content: string;
      images?: string[];
      tags?: string[];
    } = req.body;
    const authorId = req.user?.id; // Giả sử có middleware auth

    // Kiểm tra phải có ít nhất content hoặc images
    const hasContent = createData.content && createData.content.trim() !== "";
    const hasImages =
      Array.isArray(createData.images) && createData.images.length > 0;
    if (!hasContent && !hasImages) {
      return res.status(400).json({
        success: false,
        message: "Phải có ít nhất nội dung hoặc hình ảnh.",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const newPost: IPost = new Post({
      ...createData,
      author: authorId,
      likes: [],
      comments: [],
    });

    const savedPost = await newPost.save();
    await savedPost.populate("author", "fullname username avatar");

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: savedPost,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [PUT] /api/posts/:id - Cập nhật post
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const updateData: {
      title?: string;
      content?: string;
      images?: string[];
      tags?: string[];
    } = req.body;
    const userId = req.user?.id;

    const post: IPost | null = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra quyền sở hữu
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own posts",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const updatedPost: IPost | null = await Post.findByIdAndUpdate(
      postId,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "fullname username avatar");

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [DELETE] /api/posts/:id - Xóa post
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;

    const post: IPost | null = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra quyền sở hữu
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xóa ảnh trên cloud nếu có
    if (post.img) {
      // img có thể là url, cần lấy publicId từ url
      const matches = post.img.match(/\/([^/.]+)\.[a-zA-Z]+$/);
      const publicId = matches ? matches[1] : null;
      if (publicId) {
        try {
          await deleteMediaById(publicId, "image");
        } catch (err) {
          console.error("Error deleting image from cloudinary:", err);
        }
      }
    }

    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/posts/:id/like - Like/Unlike post
export const toggleLikePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const post: IPost | null = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const userIndex = post.likes.findIndex((id) => id.toString() === userId);

    if (userIndex === -1) {
      // Like post
      post.likes.push(userId as any);
    } else {
      // Unlike post
      post.likes.splice(userIndex, 1);
    }
    //commit đỡ nghe, code chưa phân trang
    await post.save();

    return res.status(200).json({
      success: true,
      message: userIndex === -1 ? "Post liked" : "Post unliked",
      data: { likes: post.likes.length },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error toggling like:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
