/**
 * 🔍 DEBUG SCRIPT: Kiểm tra UserActivity data trong DB
 *
 * Usage:
 *   npx ts-node scripts/debug-user-activity.ts <userEmail>
 *
 * Example:
 *   npx ts-node scripts/debug-user-activity.ts huybrox@gmail.com
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Import models
import User from "../src/models/user.model";
import UserActivity from "../src/models/user-activity.model";

async function debugUserActivity(email: string) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/hanabi";
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`👤 USER FOUND:`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}\n`);

    // Find user activity
    const activity = await UserActivity.findOne({ userId: user._id });
    if (!activity) {
      console.error(`❌ No UserActivity found for user: ${email}`);
      process.exit(1);
    }

    console.log(`📊 USER ACTIVITY DATA:\n`);

    // Video lessons
    const videoLessons = activity.lessonActivities.filter((l: any) => l.lessonType === "video");
    const videoTime = videoLessons.reduce((sum: number, l: any) => sum + (l.timeSpent || 0), 0);

    console.log(`📹 VIDEO LESSONS: ${videoLessons.length} lessons`);
    console.log(`   Total time: ${videoTime}s (${Math.round(videoTime / 60)}m)`);
    if (videoLessons.length > 0) {
      console.log(`   Details:`);
      videoLessons.forEach((l: any, i: number) => {
        console.log(`     ${i + 1}. ${l.lessonTitle || l.lessonId}`);
        console.log(`        Time spent: ${l.timeSpent}s`);
        console.log(`        Completed: ${l.isCompleted ? "✅" : "❌"}`);
        console.log(`        Watched: ${l.videoData?.watchedDuration || 0}s / ${l.videoData?.totalDuration || 0}s`);
      });
    }
    console.log();

    // Task lessons
    const taskLessons = activity.lessonActivities.filter((l: any) => l.lessonType === "task");
    const taskTime = taskLessons.reduce((sum: number, l: any) => sum + (l.timeSpent || 0), 0);

    console.log(`📝 TASK LESSONS: ${taskLessons.length} lessons`);
    console.log(`   Total time: ${taskTime}s (${Math.round(taskTime / 60)}m)`);
    if (taskLessons.length > 0) {
      console.log(`   Details:`);
      taskLessons.forEach((l: any, i: number) => {
        console.log(`     ${i + 1}. ${l.lessonTitle || l.lessonId}`);
        console.log(`        Time spent: ${l.timeSpent}s`);
        console.log(`        Task type: ${l.taskType || "unknown"}`);
        console.log(`        Score: ${l.taskData?.score || 0}/${l.taskData?.maxScore || 0}`);
      });
    }
    console.log();

    // Flashcard sessions
    const flashcardTime = activity.flashcardSessions.reduce(
      (sum: number, s: any) => sum + (s.sessionDuration || 0),
      0
    );

    console.log(`🎴 FLASHCARD SESSIONS: ${activity.flashcardSessions.length} sessions`);
    console.log(`   Total time: ${flashcardTime}s (${Math.round(flashcardTime / 60)}m)`);
    if (activity.flashcardSessions.length > 0) {
      console.log(`   Details:`);
      activity.flashcardSessions.forEach((s: any, i: number) => {
        console.log(`     ${i + 1}. Flashcard ID: ${s.contentId}`);
        console.log(`        Duration: ${s.sessionDuration}s`);
        console.log(`        Cards studied: ${s.cardsStudied}`);
        console.log(`        Correct: ${s.correctAnswers}`);
        console.log(`        Studied at: ${s.studiedAt}`);
      });
    }
    console.log();

    // Summary
    const totalTime = videoTime + taskTime + flashcardTime;
    console.log(`📊 SUMMARY:`);
    console.log(`   Total study time: ${totalTime}s (${Math.round(totalTime / 60)}m)`);
    console.log(`   Video: ${Math.round(videoTime / 60)}m (${totalTime > 0 ? Math.round((videoTime / totalTime) * 100) : 0}%)`);
    console.log(`   Task: ${Math.round(taskTime / 60)}m (${totalTime > 0 ? Math.round((taskTime / totalTime) * 100) : 0}%)`);
    console.log(`   Flashcard: ${Math.round(flashcardTime / 60)}m (${totalTime > 0 ? Math.round((flashcardTime / totalTime) * 100) : 0}%)`);
    console.log();

    // Daily learning stats
    console.log(`📅 DAILY LEARNING STATS: ${activity.dailyLearning.length} days`);
    if (activity.dailyLearning.length > 0) {
      const recent = activity.dailyLearning.slice(-7); // Last 7 days
      console.log(`   Last 7 days:`);
      recent.forEach((day: any) => {
        const date = new Date(day.date).toLocaleDateString();
        console.log(`     ${date}: ${day.totalStudyTime}s study, ${day.lessonsCompleted} lessons, ${day.cardsReviewed} cards`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error("❌ Usage: npx ts-node scripts/debug-user-activity.ts <userEmail>");
  console.error("   Example: npx ts-node scripts/debug-user-activity.ts huybrox@gmail.com");
  process.exit(1);
}

debugUserActivity(email);




