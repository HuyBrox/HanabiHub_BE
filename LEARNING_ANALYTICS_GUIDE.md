# Learning Analytics System - Documentation

## 📊 Tổng quan

Hệ thống phân tích học tập tự động, tính toán **80% dữ liệu bằng code** và để **20% cho AI** xử lý sau.

## 🏗️ Kiến trúc

```
UserActivity (Raw Data)
        ↓
ActivityTrackerHelper (Track activities)
        ↓
LearningAnalyticsService (Calculate 80%)
        ↓
LearningInsights (Auto-generated insights)
        ↓
AI Service (20% - predictions & recommendations)
```

## 📁 Files đã tạo

### 1. Models
- `src/models/user-activity.model.ts` - Lưu trữ hoạt động học tập
- `src/models/learning-insights.model.ts` - Lưu trữ phân tích & insights

### 2. Services
- `src/services/learning-analytics.service.ts` - Tính toán 80% insights từ code

### 3. Helpers
- `src/helpers/activity-tracker.ts` - Track và update activities

### 4. Middleware
- `src/middleware/learning-tracker.ts` - Auto-trigger updates

## 🔄 Workflow

### Khi user học xong một lesson:

```typescript
// In your lesson controller
import activityTracker from '../helpers/activity-tracker';
import { trackLearningActivity } from '../middleware/learning-tracker';

// Track lesson completion
await activityTracker.trackLessonCompletion(userId, {
  lessonId: lesson._id,
  courseId: course._id,
  lessonType: 'video', // or 'task'
  timeSpent: 300, // 5 minutes in seconds
  videoData: {
    watchedDuration: 280,
    totalDuration: 300,
    isWatchedCompletely: false
  }
});

// Auto-update insights (via middleware hoặc manual)
// Middleware sẽ tự động trigger không đồng bộ
```

### Khi user học flashcard:

```typescript
// Track flashcard session
await activityTracker.trackFlashcardSession(userId, {
  contentType: 'flashcard',
  contentId: flashcardId,
  cardsStudied: 20,
  correctAnswers: 15,
  sessionDuration: 600 // 10 minutes
});

// Track từng thẻ
await activityTracker.trackCardLearning(userId, {
  cardId: card._id,
  flashcardId: flashcard._id,
  isCorrect: true,
  responseTime: 2500 // 2.5 seconds
});
```

## 🎯 Dữ liệu được tính tự động (80%)

### 1. Learning Performance
- ✅ `overallLevel` - Beginner/Intermediate/Advanced (rule-based)
- ✅ `weeklyProgress` - % tiến bộ so với tuần trước
- ✅ `consistency` - Tần suất học (số ngày/7)
- ✅ `retention` - % nhớ được từ flashcards

### 2. Course Progress
- ✅ `coursesInProgress` - Số khóa đang học
- ✅ `averageCompletionTime` - Thời gian hoàn thành TB (days)
- ✅ `strugglingCourses` - Khóa học đang gặp khó khăn

### 3. Lesson Mastery
- ✅ Video: `completionRate`, `averageWatchTime`, `rewatch`
- ✅ Task: `averageScore`, `averageAttempts`, `commonMistakes`

### 4. Flashcard Mastery
- ✅ `masteredCards`, `learningCards`, `difficultCards`
- ✅ `averageResponseTime`, `dailyRetention`

### 5. Study Patterns
- ✅ `bestStudyTime` - Thời gian học hiệu quả nhất
- ✅ `averageSessionLength` - Thời lượng session TB
- ✅ `currentStreak`, `longestStreak` - Chuỗi ngày học
- ✅ `preferredContent` - Loại nội dung ưa thích

## 🤖 Dữ liệu cần AI (20%)

### AI Recommendations (TODO - Phase 2)
- ❌ `nextLessons` - Bài học tiếp theo nên học
- ❌ `reviewCards` - Thẻ cần ôn tập
- ❌ `studyPlan` - Kế hoạch học tập cá nhân hóa

### Predictions (TODO - Phase 2)
- ❌ `courseCompletionDates` - Dự đoán ngày hoàn thành
- ❌ `skillImprovement` - Dự đoán cải thiện kỹ năng

## 📖 Usage Examples

### 1. Integrate vào Lesson Controller

```typescript
// src/controllers/lesson.controller.ts
import activityTracker from '../helpers/activity-tracker';

export const completeLesson = async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  try {
    // Your existing logic...
    const lesson = await Lesson.findById(lessonId);

    // Track completion
    await activityTracker.trackLessonCompletion(userId, {
      lessonId: lesson._id,
      courseId: lesson.courseId,
      lessonType: lesson.type,
      timeSpent: req.body.timeSpent,
      videoData: lesson.type === 'video' ? {
        watchedDuration: req.body.watchedDuration,
        totalDuration: lesson.duration,
        isWatchedCompletely: req.body.watchedDuration >= lesson.duration
      } : undefined,
      taskData: lesson.type === 'task' ? {
        score: req.body.score,
        maxScore: lesson.maxScore,
        correctAnswers: req.body.correctAnswers,
        totalQuestions: lesson.totalQuestions,
        isPassed: req.body.score >= lesson.passingScore
      } : undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 2. Thêm Middleware vào Routes

```typescript
// src/routes/lesson.route.ts
import { trackLearningActivity } from '../middleware/learning-tracker';

router.post('/complete/:lessonId',
  isAuth,
  completeLesson,
  trackLearningActivity // Tự động update insights sau khi complete
);
```

### 3. Lấy Insights của User

```typescript
// src/controllers/user.controller.ts
import LearningInsights from '../models/learning-insights.model';

export const getUserInsights = async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  try {
    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({ message: 'No insights available yet' });
    }

    res.json({
      performance: insights.learningPerformance,
      analysis: insights.learningAnalysis,
      patterns: insights.studyPatterns,
      lastUpdated: insights.analysisDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4. Manual Trigger (Cron Job hoặc Admin)

```typescript
// scripts/update-all-insights.ts
import learningAnalyticsService from '../services/learning-analytics.service';
import User from '../models/user.model';

async function updateAllUsersInsights() {
  const users = await User.find();

  for (const user of users) {
    try {
      await learningAnalyticsService.updateLearningInsights(user._id);
      console.log(`✅ Updated insights for user ${user._id}`);
    } catch (error) {
      console.error(`❌ Failed for user ${user._id}:`, error);
    }
  }
}

// Run daily at midnight
updateAllUsersInsights();
```

## 🔧 Cấu hình

### Index cho Performance

Đã được thêm vào models:
```typescript
// user-activity.model.ts
userActivitySchema.index({ userId: 1, "dailyLearning.date": -1 });
userActivitySchema.index({ "courseActivities.lastAccessedAt": -1 });
userActivitySchema.index({ "lessonActivities.completedAt": -1 });

// learning-insights.model.ts
learningInsightsSchema.index({ userId: 1, analysisDate: -1 });
learningInsightsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## 🚀 Next Steps

### Phase 1 (Current) - ✅ Done
- [x] Design schemas
- [x] Create analytics service (80% code-based)
- [x] Create activity tracker helpers
- [x] Create middleware for auto-updates

### Phase 2 (TODO) - 🤖 AI Integration
- [ ] Build AI recommendation engine
- [ ] Implement course completion predictions
- [ ] Add personalized study plan generator
- [ ] Integrate LLM for semantic mistake analysis

### Phase 3 (TODO) - 📈 Advanced Features
- [ ] Real-time analytics dashboard
- [ ] Comparative analytics (user vs others)
- [ ] Adaptive difficulty system
- [ ] Gamification elements

## 💡 Tips

1. **Performance**: Middleware chạy async, không block response
2. **Accuracy**: Daily stats được update real-time khi user học
3. **Scalability**: Có thể chuyển sang Queue (BullMQ) nếu traffic cao
4. **Testing**: Mock UserActivity data để test analytics logic

## 🐛 Debugging

```typescript
// Check if insights are being generated
const insights = await LearningInsights.findOne({ userId });
console.log('Last analysis:', insights?.analysisDate);
console.log('Performance:', insights?.learningPerformance);

// Check raw activity data
const activity = await UserActivity.findOne({ userId });
console.log('Daily learning:', activity?.dailyLearning);
console.log('Lessons:', activity?.lessonActivities.length);
```

## 📝 Notes

- LearningInsights sẽ tự động expire sau 7 ngày (có thể config)
- Mỗi lần update sẽ recalculate toàn bộ từ UserActivity
- AI recommendations (20%) sẽ được implement ở Phase 2
- Hiện tại confidence = 100% vì dùng code thuần
