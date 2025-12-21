import {
  redisGetJson,
  redisSetJson,
  redisDel,
  redisExists,
} from "./redis";
import { IPost, PostPlainObject } from "../types/post.types";
import { IComment } from "../types/comment.types";

const CACHE_TTL = {
  POSTS_LIST: 300,
  POST_DETAIL: 600,
  COMMENTS: 180,
};

const CACHE_KEYS = {
  POSTS_LIST: "post:list",
  POST_DETAIL: (postId: string) => `post:detail:${postId}`,
  COMMENTS: (postId: string) => `comments:post:${postId}`,
};

export const cachePosts = async (
  posts: PostPlainObject[],
  ttl: number = CACHE_TTL.POSTS_LIST
): Promise<boolean> => {
  try {
    return await redisSetJson<PostPlainObject[]>(CACHE_KEYS.POSTS_LIST, posts, ttl);
  } catch (error) {
    console.error("Error caching posts:", error);
    return false;
  }
};

export const getCachedPosts = async (): Promise<PostPlainObject[] | null> => {
  try {
    return await redisGetJson<PostPlainObject[]>(CACHE_KEYS.POSTS_LIST);
  } catch (error) {
    console.error("Error getting cached posts:", error);
    return null;
  }
};

export const invalidatePostCache = async (): Promise<void> => {
  try {
    await redisDel(CACHE_KEYS.POSTS_LIST);
  } catch (error) {
    console.error("Error invalidating post cache:", error);
  }
};

export const cachePostDetail = async (
  postId: string,
  post: PostPlainObject,
  ttl: number = CACHE_TTL.POST_DETAIL
): Promise<boolean> => {
  try {
    return await redisSetJson<PostPlainObject>(
      CACHE_KEYS.POST_DETAIL(postId),
      post,
      ttl
    );
  } catch (error) {
    console.error(`Error caching post detail ${postId}:`, error);
    return false;
  }
};

export const getCachedPostDetail = async (
  postId: string
): Promise<PostPlainObject | null> => {
  try {
    return await redisGetJson<PostPlainObject>(CACHE_KEYS.POST_DETAIL(postId));
  } catch (error) {
    console.error(`Error getting cached post detail ${postId}:`, error);
    return null;
  }
};

export const invalidatePostDetailCache = async (postId: string): Promise<void> => {
  try {
    await redisDel(CACHE_KEYS.POST_DETAIL(postId));
  } catch (error) {
    console.error(`Error invalidating post detail cache ${postId}:`, error);
  }
};

export const cacheComments = async (
  postId: string,
  comments: IComment[],
  ttl: number = CACHE_TTL.COMMENTS
): Promise<boolean> => {
  try {
    return await redisSetJson<IComment[]>(
      CACHE_KEYS.COMMENTS(postId),
      comments,
      ttl
    );
  } catch (error) {
    console.error(`Error caching comments for post ${postId}:`, error);
    return false;
  }
};

export const getCachedComments = async (
  postId: string
): Promise<IComment[] | null> => {
  try {
    return await redisGetJson<IComment[]>(CACHE_KEYS.COMMENTS(postId));
  } catch (error) {
    console.error(`Error getting cached comments for post ${postId}:`, error);
    return null;
  }
};

export const invalidateCommentCache = async (postId: string): Promise<void> => {
  try {
    await redisDel(CACHE_KEYS.COMMENTS(postId));
  } catch (error) {
    console.error(`Error invalidating comment cache for post ${postId}:`, error);
  }
};

export const invalidateAllPostCaches = async (postId?: string): Promise<void> => {
  try {
    const keysToDelete: string[] = [CACHE_KEYS.POSTS_LIST];
    
    if (postId) {
      keysToDelete.push(CACHE_KEYS.POST_DETAIL(postId));
      keysToDelete.push(CACHE_KEYS.COMMENTS(postId));
    }
    
    await redisDel(keysToDelete);
  } catch (error) {
    console.error("Error invalidating all post caches:", error);
  }
};

