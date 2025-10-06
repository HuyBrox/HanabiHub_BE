# 🎯 User Activity Tracking API - Frontend Integration Guide

## Tổng quan

API này cho phép FE **âm thầm gửi activities** lên backend để track hành vi học tập của user. Mỗi khi user thực hiện một hành động học tập (xem video, làm bài, học flashcard), FE gửi request lên để lưu vào `UserActivity`, sau đó hệ thống tự động tính toán và cập nhật `LearningInsights`.

## 🔑 Base URL

```
/api/user-activity
```

Tất cả routes đều yêu cầu **authentication** (Bearer token trong header)

---

## 📹 1. Track Video Lesson

**Endpoint:** `POST /api/user-activity/track-video`

**Khi nào gọi:**
- User bắt đầu xem video
- User xem xong video (hoặc đóng video)
- User tua video

**Request Body:**
```typescript
{
  courseId?: string;           // ObjectId của course (optional)
  lessonId: string;            // ObjectId của lesson (required)
  lessonTitle?: string;        // Tên bài học
  totalDuration: number;       // Tổng thời lượng video (seconds)
  watchedDuration: number;     // Thời gian đã xem (seconds)
  isWatchedCompletely: boolean; // Đã xem hết chưa
  watchCount?: number;         // Số lần xem (default: 1)
  completedAt?: string;        // ISO date string khi hoàn thành
}
```

**Frontend Example:**
```typescript
// React/Next.js example
const trackVideoWatch = async (videoData) => {
  try {
    await fetch('/api/user-activity/track-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: '507f1f77bcf86cd799439011',
        lessonId: '507f1f77bcf86cd799439012',
        lessonTitle: 'Introduction to React Hooks',
        totalDuration: 600,        // 10 minutes
        watchedDuration: 590,      // Watched 9:50
        isWatchedCompletely: false,
        watchCount: 1
      })
    });
  } catch (error) {
    console.error('Failed to track video:', error);
  }
};

// Call khi user đóng video hoặc video kết thúc
videoPlayer.on('pause', () => trackVideoWatch(videoData));
videoPlayer.on('ended', () => trackVideoWatch({...videoData, isWatchedCompletely: true}));
```

**Response:**
```json
{
  "success": true,
  "message": "Video activity tracked"
}
```

---

## 📝 2. Track Task/Quiz Lesson

**Endpoint:** `POST /api/user-activity/track-task`

**Khi nào gọi:**
- User submit quiz/task
- User hoàn thành bài tập

**Request Body:**
```typescript
{
  courseId?: string;           // ObjectId của course (optional)
  lessonId: string;            // ObjectId của lesson (required)
  lessonTitle?: string;        // Tên bài học
  score: number;               // Điểm đạt được (required)
  maxScore?: number;           // Điểm tối đa (default: 100)
  correctAnswers?: number;     // Số câu đúng
  totalQuestions?: number;     // Tổng số câu hỏi
  timeSpent?: number;          // Thời gian làm bài (seconds)
  completedAt?: string;        // ISO date string
}
```

**Frontend Example:**
```typescript
const submitQuiz = async (answers) => {
  // Chấm điểm
  const score = calculateScore(answers);

  // Track activity
  await fetch('/api/user-activity/track-task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      courseId: '507f1f77bcf86cd799439011',
      lessonId: '507f1f77bcf86cd799439013',
      lessonTitle: 'React Hooks Quiz',
      score: 85,
      maxScore: 100,
      correctAnswers: 17,
      totalQuestions: 20,
      timeSpent: 300,  // 5 minutes
      completedAt: new Date().toISOString()
    })
  });
};
```

**Response:**
```json
{
  "success": true,
  "message": "Task activity tracked",
  "passed": true
}
```

---

## 🎴 3. Track Flashcard Session

**Endpoint:** `POST /api/user-activity/track-flashcard-session`

**Khi nào gọi:**
- User kết thúc session học flashcard
- User đóng flashcard deck

**Request Body:**
```typescript
{
  flashcardId: string;         // ObjectId của flashcard deck (required)
  cardsStudied: number;        // Số thẻ đã học (required)
  correctAnswers?: number;     // Số thẻ trả lời đúng
  sessionDuration?: number;    // Thời gian học (seconds)
  difficulty?: string;         // 'easy' | 'medium' | 'hard'
  studiedAt?: string;          // ISO date string
}
```

**Frontend Example:**
```typescript
const endFlashcardSession = async (sessionData) => {
  await fetch('/api/user-activity/track-flashcard-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      flashcardId: '507f1f77bcf86cd799439014',
      cardsStudied: 25,
      correctAnswers: 20,
      sessionDuration: 600,  // 10 minutes
      difficulty: 'medium',
      studiedAt: new Date().toISOString()
    })
  });
};

// Call khi user click "End Session" hoặc đóng app
flashcardApp.on('session-end', endFlashcardSession);
```

**Response:**
```json
{
  "success": true,
  "message": "Flashcard session tracked"
}
```

---

## 🃏 4. Track Individual Card Learning

**Endpoint:** `POST /api/user-activity/track-card`

**Khi nào gọi:**
- Mỗi khi user trả lời một thẻ flashcard
- Real-time tracking từng thẻ

**Request Body:**
```typescript
{
  cardId: string;              // ObjectId của card (required)
  flashcardId: string;         // ObjectId của flashcard deck (required)
  isCorrect?: boolean;         // Trả lời đúng/sai
  responseTime?: number;       // Thời gian trả lời (milliseconds)
  difficulty?: string;         // 'again' | 'hard' | 'good' | 'easy'
  reviewCount?: number;        // Số lần review (default: 1)
  studiedAt?: string;          // ISO date string
}
```

**Frontend Example:**
```typescript
const answerCard = async (cardData) => {
  await fetch('/api/user-activity/track-card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cardId: '507f1f77bcf86cd799439015',
      flashcardId: '507f1f77bcf86cd799439014',
      isCorrect: true,
      responseTime: 2500,  // 2.5 seconds
      difficulty: 'good',
      reviewCount: 1
    })
  });
};

// Call ngay khi user flip card và chọn answer
flashcard.on('answer', (data) => {
  answerCard(data);
  // Không cần await, gửi âm thầm
});
```

**Response:**
```json
{
  "success": true,
  "message": "Card learning tracked",
  "masteryLevel": "learning"
}
```

---

## 📚 5. Track Course Access

**Endpoint:** `POST /api/user-activity/track-course-access`

**Khi nào gọi:**
- User enroll vào course
- User truy cập course (continue learning)
- User hoàn thành course

**Request Body:**
```typescript
{
  courseId: string;            // ObjectId của course (required)
  action?: string;             // 'enroll' | 'continue' | 'complete'
  isCompleted?: boolean;       // Course đã hoàn thành chưa
}
```

**Frontend Example:**
```typescript
// Khi user enroll
const enrollCourse = async (courseId) => {
  await fetch('/api/user-activity/track-course-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      courseId: '507f1f77bcf86cd799439011',
      action: 'enroll',
      isCompleted: false
    })
  });
};

// Khi user mở course
const openCourse = async (courseId) => {
  await fetch('/api/user-activity/track-course-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      courseId: '507f1f77bcf86cd799439011',
      action: 'continue'
    })
  });
};

// Khi user complete course
const completeCourse = async (courseId) => {
  await fetch('/api/user-activity/track-course-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      courseId: '507f1f77bcf86cd799439011',
      action: 'complete',
      isCompleted: true
    })
  });
};
```

**Response:**
```json
{
  "success": true,
  "message": "Course enroll tracked"
}
```

---

## 📊 6. Get Activity Summary (Optional)

**Endpoint:** `GET /api/user-activity/summary`

**Khi nào gọi:**
- Debug hoặc hiển thị tổng quan hoạt động
- User profile page

**Request:** No body needed

**Frontend Example:**
```typescript
const getActivitySummary = async () => {
  const response = await fetch('/api/user-activity/summary', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLessons": 45,
    "totalFlashcardSessions": 23,
    "totalCardsLearned": 567,
    "totalDays": 15,
    "totalTimeSpent": 18000,
    "coursesCount": 5
  }
}
```

---

## 🗑️ 7. Clear Activity (Testing Only)

**Endpoint:** `DELETE /api/user-activity/clear`

**Khi nào gọi:**
- Testing environment only
- Reset user progress

**Request:** No body needed

**Response:**
```json
{
  "success": true,
  "message": "User activity cleared"
}
```

---

## 🎯 Best Practices cho Frontend

### 1. **Fire and Forget Pattern**

Không cần await hoặc block UI khi track activities:

```typescript
// ✅ Good: Non-blocking
const trackActivity = (data) => {
  fetch('/api/user-activity/track-video', {
    method: 'POST',
    headers: {...},
    body: JSON.stringify(data)
  }).catch(error => {
    // Log lỗi nhưng không show cho user
    console.error('Tracking failed:', error);
  });
};

// ❌ Bad: Blocking UI
const trackActivity = async (data) => {
  await fetch(... ); // User phải đợi
};
```

### 2. **Batch Tracking với Debounce**

Tránh gọi API quá nhiều lần:

```typescript
import { debounce } from 'lodash';

// Debounce video progress tracking
const trackVideoProgress = debounce((data) => {
  fetch('/api/user-activity/track-video', {...});
}, 5000); // Chỉ gọi sau 5s không có thay đổi

videoPlayer.on('timeupdate', () => {
  trackVideoProgress(videoData);
});
```

### 3. **Offline Support với Queue**

Lưu vào localStorage nếu mất kết nối:

```typescript
const trackWithQueue = async (endpoint, data) => {
  try {
    await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    // Lưu vào queue nếu offline
    const queue = JSON.parse(localStorage.getItem('activityQueue') || '[]');
    queue.push({ endpoint, data, timestamp: Date.now() });
    localStorage.setItem('activityQueue', JSON.stringify(queue));
  }
};

// Khi online lại, gửi queue
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('activityQueue') || '[]');
  for (const item of queue) {
    await trackWithQueue(item.endpoint, item.data);
  }
  localStorage.removeItem('activityQueue');
});
```

### 4. **Error Handling**

```typescript
const trackActivity = async (endpoint, data) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Log to monitoring service (Sentry, LogRocket, etc.)
    console.error('Activity tracking failed:', {
      endpoint,
      data,
      error: error.message
    });

    // Không show error cho user (silent tracking)
    return { success: false };
  }
};
```

---

## 🔄 Flow tự động

```
User xem video/làm bài
    ↓
FE gọi track API (âm thầm, non-blocking)
    ↓
BE lưu vào UserActivity
    ↓
queueLearningUpdate(userId) [Debounced 5s]
    ↓
[Sau 5s không có activity mới]
    ↓
learningAnalyticsService.updateLearningInsights()
    ↓
LearningInsights được cập nhật ✅
    ↓
User xem insights qua GET /api/learning-insights/my-insights
```

---

## 📦 TypeScript Types cho Frontend

```typescript
// types/activity-tracking.ts

export interface TrackVideoRequest {
  courseId?: string;
  lessonId: string;
  lessonTitle?: string;
  totalDuration: number;
  watchedDuration: number;
  isWatchedCompletely: boolean;
  watchCount?: number;
  completedAt?: string;
}

export interface TrackTaskRequest {
  courseId?: string;
  lessonId: string;
  lessonTitle?: string;
  score: number;
  maxScore?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  timeSpent?: number;
  completedAt?: string;
}

export interface TrackFlashcardSessionRequest {
  flashcardId: string;
  cardsStudied: number;
  correctAnswers?: number;
  sessionDuration?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  studiedAt?: string;
}

export interface TrackCardRequest {
  cardId: string;
  flashcardId: string;
  isCorrect?: boolean;
  responseTime?: number;
  difficulty?: 'again' | 'hard' | 'good' | 'easy';
  reviewCount?: number;
  studiedAt?: string;
}

export interface TrackCourseAccessRequest {
  courseId: string;
  action?: 'enroll' | 'continue' | 'complete';
  isCompleted?: boolean;
}

export interface ActivityResponse {
  success: boolean;
  message: string;
}
```

---

## 🚀 Ready to Use!

System đã sẵn sàng. FE chỉ cần:
1. Call các API tracking khi user thực hiện hành động
2. Không cần lo lắng về tính toán insights (BE tự động)
3. Lấy insights từ `/api/learning-insights/*` endpoints

**Hoàn toàn tự động, âm thầm & hiệu quả! 🎯**
