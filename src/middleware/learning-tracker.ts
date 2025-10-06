import { Queue, Worker, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import learningAnalyticsService from "../services/learning-analytics.service";

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// BullMQ Queue for learning insights updates
const learningInsightsQueue = new Queue("learning-insights", {
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

const MIN_UPDATE_INTERVAL = 60000; // 1 minute minimum between updates

// Worker to process learning insights updates
const worker = new Worker(
  "learning-insights",
  async (job) => {
    const { userId } = job.data;
    console.log(`🔄 Processing learning insights for user ${userId}`);

    try {
      await learningAnalyticsService.updateLearningInsights(userId);
      console.log(`✅ Learning insights updated for user ${userId}`);
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
  console.log(`✅ Job ${job.id} completed for user ${job.data.userId}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

/**
 * ✅ MAIN FUNCTION: Queue learning insights update with BullMQ
 * Automatically called after UserActivity save
 */
export const queueLearningUpdate = async (userId: string) => {
  try {
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

    console.log(`📝 Queued learning update for user ${userId}`);
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

    console.log(`⚡ Force queued learning update for user ${userId}`);
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
    await learningInsightsQueue.drain();
    console.log("🧹 Cleared all pending learning updates");
  } catch (error: any) {
    console.error("Failed to clear pending updates:", error.message);
  }
};

/**
 * Cleanup function (call on app shutdown)
 */
export const cleanup = async () => {
  await worker.close();
  await learningInsightsQueue.close();
  await redisConnection.quit();
  console.log("🔌 Learning tracker cleanup completed");
};
