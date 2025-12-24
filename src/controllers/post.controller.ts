import { Request, Response } from "express";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import { ApiResponse, IPost, AuthRequest, PostPlainObject } from "../types";
import { uploadImage } from "../helpers/upload-media";
import {
  getCachedPosts,
  cachePosts,
  invalidatePostCache,
  getCachedPostDetail,
  cachePostDetail,
  invalidatePostDetailCache,
  invalidateAllPostCaches,
} from "../utils/cache";
import { io } from "../socket/socket-server";

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const cachedPosts = await getCachedPosts();
    if (cachedPosts) {
      return res.status(200).json({
        success: true,
        message: "Posts retrieved successfully (cached)",
        data: cachedPosts,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const posts = await Post.find()
      .populate("author", "fullname username avatar")
      .sort({ createdAt: -1 })
      .lean() as PostPlainObject[];

    const postsWithCommentCount = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({
          targetModel: "Post",
          targetId: post._id,
        });
        return {
          ...post,
          commentCount,
        };
      })
    );

    await cachePosts(postsWithCommentCount);

    return res.status(200).json({
      success: true,
      message: "Posts retrieved successfully",
      data: postsWithCommentCount,
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

export const getPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    const cachedPost = await getCachedPostDetail(postId);
    if (cachedPost) {
      return res.status(200).json({
        success: true,
        message: "Post retrieved successfully (cached)",
        data: cachedPost,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const post = await Post.findById(postId)
      .populate("author", "fullname username avatar")
      .lean() as PostPlainObject | null;

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const commentCount = await Comment.countDocuments({
      targetModel: "Post",
      targetId: postId,
    });

    const postWithCommentCount = {
      ...post,
      commentCount,
    };

    await cachePostDetail(postId, postWithCommentCount);

    return res.status(200).json({
      success: true,
      message: "Post retrieved successfully",
      data: postWithCommentCount,
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

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { caption, desc } = req.body;
    const authorId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      try {
        imageUrls = await Promise.all(
          files.map((file) => uploadImage({ buffer: file.buffer }))
        );
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Error uploading images",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    const newPost: IPost = new Post({
      caption: caption || "",
      desc: desc || "",
      images: imageUrls,
      author: authorId,
      likes: [],
      comments: [],
    });

    const savedPost = await newPost.save();
    await savedPost.populate("author", "fullname username avatar");

    await invalidatePostCache();

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

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { caption, desc, images } = req.body;
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    const post: IPost | null = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own posts",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const updateData: any = {};
    if (caption !== undefined) updateData.caption = caption;
    if (desc !== undefined) updateData.desc = desc;

    if (files && files.length > 0) {
      try {
        const imageUrls = await Promise.all(
          files.map((file) => uploadImage({ buffer: file.buffer }))
        );
        updateData.images = imageUrls;
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Error uploading images",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    } else if (images !== undefined) {
      updateData.images = images;
    }

    const updatedPost: IPost | null = await Post.findByIdAndUpdate(
      postId,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "fullname username avatar");

    await invalidateAllPostCaches(postId);

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

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    await Comment.deleteMany({
      targetModel: "Post",
      targetId: postId,
    });

    await Post.findByIdAndDelete(postId);

    await invalidateAllPostCaches(postId);

    io.emit("post:deleted", {
      postId: postId.toString(),
    });

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
      post.likes.push(userId as any);
    } else {
      post.likes.splice(userIndex, 1);
    }

    await post.save();

    await invalidatePostDetailCache(postId);
    await invalidatePostCache();

    io.emit("post:liked", {
      postId: postId.toString(),
      userId: userId.toString(),
      likes: post.likes.map((id) => id.toString()),
      isLiked: userIndex === -1,
    });

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
