import { Queue, Worker, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import aiRecommendationService from "../services/ai-recommendation.service";
import LearningInsights from "../models/learning-insights.model";

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// BullMQ Queue for AI recommendations
const aiRecommendationQueue = new Queue("ai-recommendations", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2, // Only retry once (AI calls are expensive)
    backoff: {
      type: "exponential",
      delay: 5000, // 5s delay before retry
    },
  },
});

const MIN_UPDATE_INTERVAL = 3600000; // 1 hour minimum between AI calls

// Worker to process AI recommendation requests
const worker = new Worker(
  "ai-recommendations",
  async (job) => {
    const { userId } = job.data;
    console.log(`🤖 [AI Queue] Processing AI advice for user: ${userId}`);

    try {
      // Generate AI advice (CHỈ LỜI KHUYÊN ĐỘNG VIÊN, không recommendations)
      const advice =
        await aiRecommendationService.generateAdvice(userId);

      // Update LearningInsights with AI advice
      const insights = await LearningInsights.findOne({ userId });

      if (!insights) {
        console.warn(
          `⚠️  LearningInsights not found for user ${userId}, skipping update`
        );
        return { success: false, userId, error: "Insights not found" };
      }

      // Update AI advice (CHỈ TEXT động viên)
      insights.aiAdvice = {
        message: advice.message || "Keep up the great work!",
        tone: advice.tone || "encouraging",
        generatedAt: new Date(),
      };

      // Update metadata
      if (!insights.modelMetadata) {
        insights.modelMetadata = {
          lastSyncedAt: new Date(),
          lastUpdated: new Date(),
        } as any;
      } else {
        insights.modelMetadata.lastSyncedAt = new Date();
        insights.modelMetadata.lastUpdated = new Date();
      }

      await insights.save();

      console.log(`✅ [AI Queue] Updated AI advice for user: ${userId}`);
      return { success: true, userId, advice };
    } catch (error: any) {
      console.error(
        `❌ [AI Queue] Failed to process AI advice for user ${userId}:`,
        error.message
      );
      throw error; // Will trigger retry via BullMQ
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 AI requests at a time (avoid overloading AI service)
  }
);

// Event listeners for monitoring
worker.on("completed", (job) => {
  console.log(
    `✅ [AI Queue] Completed AI advice for user: ${job.data.userId}`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `❌ [AI Queue] Failed job for user ${job?.data?.userId}:`,
    err.message
  );
});

worker.on("error", (err) => {
  console.error("❌ [AI Queue] Worker error:", err);
});

// QueueEvents for monitoring
const queueEvents = new QueueEvents("ai-recommendations", {
  connection: redisConnection,
});

queueEvents.on("waiting", ({ jobId }) => {
  console.log(`⏳ [AI Queue] Job ${jobId} is waiting`);
});

queueEvents.on("active", ({ jobId }) => {
  console.log(`▶️  [AI Queue] Job ${jobId} is active`);
});

// In-memory cache để track last request time
const lastRequestTime = new Map<string, number>();

/**
 * Queue AI advice generation (CHỈ LỜI KHUYÊN, không recommendations)
 * Với rate limiting để tránh spam AI service
 */
export async function queueAIRecommendation(userId: string): Promise<boolean> {
  try {
    // Check if user already has a pending job
    const jobs = await aiRecommendationQueue.getJobs([
      "waiting",
      "active",
      "delayed",
    ]);
    const hasPendingJob = jobs.some((job) => job.data.userId === userId);

    if (hasPendingJob) {
      console.log(
        `⏭️  [AI Queue] User ${userId} already has pending AI job, skipping`
      );
      return false;
    }

    // Check rate limiting
    const lastTime = lastRequestTime.get(userId) || 0;
    const now = Date.now();

    if (now - lastTime < MIN_UPDATE_INTERVAL) {
      const remainingMs = MIN_UPDATE_INTERVAL - (now - lastTime);
      const remainingMin = Math.ceil(remainingMs / 60000);
      console.log(
        `⏱️  [AI Queue] Rate limit: User ${userId} must wait ${remainingMin} more minutes`
      );
      return false;
    }

    // Add job to queue
    await aiRecommendationQueue.add(
      "generate-advice",
      { userId },
      {
        priority: 5, // Medium priority
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // Update last request time
    lastRequestTime.set(userId, now);

    console.log(`✅ [AI Queue] Queued AI advice for user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ [AI Queue] Error queuing job for user ${userId}:`, error);
    return false;
  }
}

/**
 * Force queue AI recommendation (bypass rate limiting)
 * Dùng khi user explicitly request recommendations
 */
export async function forceQueueAIRecommendation(
  userId: string
): Promise<boolean> {
  try {
    await aiRecommendationQueue.add(
      "generate-recommendations",
      { userId },
      {
        priority: 1, // High priority
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    lastRequestTime.set(userId, Date.now());

    console.log(
      `🚀 [AI Queue] Force queued AI recommendations for user: ${userId}`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ [AI Queue] Error force queuing job for user ${userId}:`,
      error
    );
    return false;
  }
}

/**
 * Get queue stats
 */
export async function getAIQueueStats() {
  const waiting = await aiRecommendationQueue.getWaitingCount();
  const active = await aiRecommendationQueue.getActiveCount();
  const completed = await aiRecommendationQueue.getCompletedCount();
  const failed = await aiRecommendationQueue.getFailedCount();

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active,
  };
}

// Cleanup on exit
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down AI recommendation queue...");
  await worker.close();
  await queueEvents.close();
  await redisConnection.quit();
});

export default aiRecommendationQueue;
