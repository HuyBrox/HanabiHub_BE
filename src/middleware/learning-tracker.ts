import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import learningAnalyticsService from "../services/learning-analytics.service";

// Graceful initialization: Disable when REDIS_URL is missing
const REDIS_URL = process.env.REDIS_URL;
const isLearningTrackerEnabled = Boolean(REDIS_URL);

let redisConnection: Redis | null = null;
let learningInsightsQueue: Queue | null = null;
let worker: Worker | null = null;

if (isLearningTrackerEnabled) {
  // Redis connection
  redisConnection = new Redis(REDIS_URL as string, {
    maxRetriesPerRequest: null,
  });

  // BullMQ Queue for learning insights updates
  learningInsightsQueue = new Queue("learning-insights", {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  });
}

const MIN_UPDATE_INTERVAL = 60000; // 1 minute minimum between updates

// Worker to process learning insights updates (only when enabled)
if (isLearningTrackerEnabled && learningInsightsQueue && redisConnection) {
  worker = new Worker(
    "learning-insights",
    async (job) => {
      const { userId } = job.data;
      console.log(`🔄 Đang xử lý cập nhật học tập cho user: ${userId}`);

      try {
        await learningAnalyticsService.updateLearningInsights(userId);
        console.log(`✅ Đã cập nhật học tập cho user: ${userId}`);
        return { success: true, userId };
      } catch (error: any) {
        console.error(
          `❌ Failed to update insights for user ${userId}:`,
          error.message
        );
        throw error; // Will trigger retry via BullMQ
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 jobs concurrently
    }
  );

  // Event listeners for monitoring
  worker.on("completed", (job) => {
    console.log(`✅ Hoàn thành cập nhật cho user: ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `❌ Lỗi cập nhật cho user: ${job?.data?.userId}. ${err.message}`
    );
  });
} else {
  console.warn(
    "Learning tracker disabled: REDIS_URL not set. BullMQ features are off in this environment."
  );
}

/**
 * ✅ MAIN FUNCTION: Queue learning insights update with BullMQ
 * Automatically called after UserActivity save
 */
export const queueLearningUpdate = async (userId: string) => {
  try {
    if (!isLearningTrackerEnabled || !learningInsightsQueue) {
      console.warn(
        `Learning tracker disabled; skipping queue add for user ${userId}.`
      );
      return;
    }
    // Add job to queue with delay (debounce) and deduplication
    await learningInsightsQueue.add(
      `update-${userId}`,
      { userId },
      {
        jobId: `learning-insights-${userId}`, // Deduplicate by userId
        delay: 5000, // 5 second debounce
        removeOnComplete: true,
      }
    );

    console.log(`📝 Đã xếp hàng cập nhật học tập cho user: ${userId}`);
  } catch (error: any) {
    console.error(
      `❌ Failed to queue learning update for ${userId}:`,
      error.message
    );
  }
};

/**
 * Force update immediately (bypass debounce)
 */
export const forceUpdateNow = async (userId: string) => {
  try {
    if (!isLearningTrackerEnabled || !learningInsightsQueue) {
      console.warn(
        `Learning tracker disabled; skipping force update for user ${userId}.`
      );
      return { success: false, error: "Learning tracker disabled" };
    }
    // Remove pending job if exists
    const job = await learningInsightsQueue.getJob(
      `learning-insights-${userId}`
    );
    if (job) {
      await job.remove();
    }

    // Add with no delay
    await learningInsightsQueue.add(
      `update-${userId}`,
      { userId },
      {
        priority: 1, // High priority
        removeOnComplete: true,
      }
    );

    console.log(`⚡ Đã ép cập nhật học tập cho user: ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Force update failed for ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get queue status for monitoring
 */
export const getQueueStatus = async () => {
  try {
    if (!isLearningTrackerEnabled || !learningInsightsQueue) {
      return {
        error: "Learning tracker disabled",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      };
    }
    const [waiting, active, completed, failed] = await Promise.all([
      learningInsightsQueue.getWaitingCount(),
      learningInsightsQueue.getActiveCount(),
      learningInsightsQueue.getCompletedCount(),
      learningInsightsQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active,
    };
  } catch (error: any) {
    console.error("Failed to get queue status:", error.message);
    return { error: error.message };
  }
};

/**
 * Clear all pending updates (graceful shutdown)
 */
export const clearAllPendingUpdates = async () => {
  try {
    if (!isLearningTrackerEnabled || !learningInsightsQueue) {
      return;
    }
    await learningInsightsQueue.drain();
    console.log("🧹 Đã xoá toàn bộ nhiệm vụ cập nhật học tập đang chờ");
  } catch (error: any) {
    console.error("Failed to clear pending updates:", error.message);
  }
};

/**
 * Cleanup function (call on app shutdown)
 */
export const cleanup = async () => {
  try {
    if (worker) {
      await worker.close();
    }
    if (learningInsightsQueue) {
      await learningInsightsQueue.close();
    }
    if (redisConnection) {
      await redisConnection.quit();
    }
    console.log("🔌 Đã dọn dẹp xong learning tracker");
  } catch (error) {
    console.error("Lỗi dọn dẹp learning tracker:", (error as Error).message);
  }
};
