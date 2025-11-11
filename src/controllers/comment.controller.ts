import { Request, Response } from "express";
import Comment from "../models/comment.model";
import Post from "../models/post.model";
import { ApiResponse, AuthRequest, IComment } from "../types";
import {
  getCachedComments,
  cacheComments,
  invalidateCommentCache,
  invalidatePostDetailCache,
  invalidatePostCache,
} from "../utils/cache";
import { io } from "../socket/socket-server";

export const getCommentsByPost = async (
  req: Request,
  res: Response
) => {
  try {
    const postId = req.params.postId;

    const cachedComments = await getCachedComments(postId);
    if (cachedComments) {
      return res.status(200).json({
        success: true,
        message: "Comments retrieved successfully (cached)",
        data: cachedComments,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const comments = await Comment.find({
      targetModel: "Post",
      targetId: postId,
      parentId: null,
    })
      .populate("author", "fullname username avatar")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "fullname username avatar",
        },
        options: { sort: { createdAt: 1 } },
      })
      .sort({ createdAt: -1 })
      .lean();

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment: any) => {
        if (comment.replies && comment.replies.length > 0) {
          const nestedReplies = await Comment.find({
            parentId: { $in: comment.replies.map((r: any) => r._id) },
          })
            .populate("author", "fullname username avatar")
            .sort({ createdAt: 1 })
            .lean();

          comment.replies = comment.replies.map((reply: any) => {
            const nested = nestedReplies.filter(
              (nr: any) => nr.parentId?.toString() === reply._id.toString()
            );
            return {
              ...reply,
              replies: nested,
            };
          });
        }
        return comment;
      })
    );

    await cacheComments(postId, commentsWithReplies as IComment[]);

    return res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: commentsWithReplies,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const createComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { text, targetId, parentId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!text || !targetId) {
      return res.status(400).json({
        success: false,
        message: "Text and targetId are required",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const post = await Post.findById(targetId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    const newComment = new Comment({
      text,
      author: userId,
      targetModel: "Post",
      targetId,
      parentId: parentId || null,
    });

    const savedComment = await newComment.save();
    await savedComment.populate("author", "fullname username avatar");

    if (!parentId) {
      post.comments.push(savedComment._id);
      await post.save();
    }

    await invalidateCommentCache(targetId);
    await invalidatePostDetailCache(targetId);
    await invalidatePostCache();

    const commentData = savedComment.toObject ? savedComment.toObject() : JSON.parse(JSON.stringify(savedComment));
    
    io.emit("comment:created", {
      comment: commentData,
      postId: targetId.toString(),
      parentId: parentId ? parentId.toString() : null,
    });

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: savedComment,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const updateComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const commentId = req.params.id;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own comments",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    comment.text = text;
    const updatedComment = await comment.save();
    await updatedComment.populate("author", "fullname username avatar");

    await invalidateCommentCache(comment.targetId.toString());
    await invalidatePostDetailCache(comment.targetId.toString());

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: updatedComment,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const deleteComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;
    const isAdmin = req.user?.isAdmin || false;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (comment.author.toString() !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const targetId = comment.targetId.toString();
    const parentId = comment.parentId ? comment.parentId.toString() : null;

    await Comment.deleteMany({ parentId: commentId });
    await Comment.findByIdAndDelete(commentId);

    if (!comment.parentId) {
      const post = await Post.findById(targetId);
      if (post) {
        post.comments = post.comments.filter(
          (id) => id.toString() !== commentId
        );
        await post.save();
      }
    }

    await invalidateCommentCache(targetId);
    await invalidatePostDetailCache(targetId);

    io.emit("comment:deleted", {
      commentId: commentId.toString(),
      postId: targetId,
      parentId: parentId,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const toggleLikeComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const userIndex = comment.likes.findIndex(
      (id) => id.toString() === userId
    );

    if (userIndex === -1) {
      comment.likes.push(userId as any);
    } else {
      comment.likes.splice(userIndex, 1);
    }

    await comment.save();

    await invalidateCommentCache(comment.targetId.toString());
    await invalidatePostDetailCache(comment.targetId.toString());
    await invalidatePostCache();

    io.emit("comment:liked", {
      commentId: commentId.toString(),
      postId: comment.targetId.toString(),
      userId: userId.toString(),
      likes: comment.likes.map((id) => id.toString()),
      isLiked: userIndex === -1,
    });

    return res.status(200).json({
      success: true,
      message: userIndex === -1 ? "Comment liked" : "Comment unliked",
      data: { likes: comment.likes.length },
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

