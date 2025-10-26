import Template from "../models/template.model";

/**
 * Seed default notification templates for JapanLearn platform
 */
export const seedTemplates = async () => {
  try {
    const existingCount = await Template.countDocuments();
    
    if (existingCount > 0) {
      console.log("✅ Templates already seeded, skipping...");
      return;
    }

    const templates = [
      // System Templates
      {
        name: "welcome_new_user",
        title: "🎌 Chào mừng đến với JapanLearn!",
        content: "Xin chào! Chúc mừng bạn đã tham gia cộng đồng học tiếng Nhật JapanLearn. Hãy bắt đầu hành trình chinh phục tiếng Nhật của bạn ngay hôm nay! 頑張ってください！",
        type: "system"
      },
      {
        name: "system_maintenance",
        title: "🔧 Thông báo bảo trì hệ thống",
        content: "Hệ thống sẽ được bảo trì vào [THỜI GIAN]. Trong thời gian này, bạn có thể không truy cập được một số tính năng. Chúng tôi xin lỗi vì sự bất tiện này.",
        type: "system"
      },
      {
        name: "system_update",
        title: "✨ Cập nhật tính năng mới",
        content: "JapanLearn vừa có bản cập nhật mới với nhiều tính năng thú vị! Hãy khám phá và trải nghiệm ngay nhé!",
        type: "system"
      },
      {
        name: "security_alert",
        title: "🔒 Cảnh báo bảo mật",
        content: "Chúng tôi phát hiện hoạt động bất thường trên tài khoản của bạn. Vui lòng đổi mật khẩu và kiểm tra thông tin bảo mật.",
        type: "system"
      },

      // Course Templates
      {
        name: "course_completed",
        title: "🎉 Chúc mừng hoàn thành khóa học!",
        content: "Xin chúc mừng! Bạn đã hoàn thành khóa học [TÊN KHÓA HỌC]. Hãy tiếp tục học tập và nâng cao trình độ tiếng Nhật của mình!",
        type: "personal"
      },
      {
        name: "new_lesson_available",
        title: "📚 Bài học mới đã sẵn sàng",
        content: "Bài học mới '[TÊN BÀI HỌC]' trong khóa học [TÊN KHÓA HỌC] đã được mở khóa. Hãy tiếp tục học tập nhé!",
        type: "personal"
      },
      {
        name: "course_reminder",
        title: "⏰ Nhắc nhở học tập",
        content: "Bạn chưa học bài trong [SỐ NGÀY] ngày rồi! Hãy dành chút thời gian để ôn luyện và duy trì tiến độ học tập nhé. 毎日頑張りましょう！",
        type: "personal"
      },

      // Achievement Templates
      {
        name: "achievement_unlocked",
        title: "🏆 Mở khóa thành tựu mới!",
        content: "Chúc mừng! Bạn đã đạt được thành tựu '[TÊN THÀNH TỰU]'. Tiếp tục cố gắng để mở khóa thêm nhiều thành tựu khác nhé!",
        type: "personal"
      },
      {
        name: "streak_milestone",
        title: "🔥 Chuỗi học tập ấn tượng!",
        content: "Wow! Bạn đã học liên tục [SỐ NGÀY] ngày! Đây là một thành tích tuyệt vời. Hãy tiếp tục duy trì nhé!",
        type: "personal"
      },
      {
        name: "level_up",
        title: "⬆️ Thăng cấp thành công!",
        content: "Chúc mừng! Bạn đã thăng cấp lên Level [LEVEL]. Nhiều nội dung học tập mới đang chờ đón bạn!",
        type: "personal"
      },

      // Contest Templates
      {
        name: "contest_announcement",
        title: "🎯 Thông báo cuộc thi mới",
        content: "Cuộc thi '[TÊN CUỘC THI]' sắp diễn ra! Đăng ký ngay để có cơ hội giành giải thưởng hấp dẫn và thử thách bản thân!",
        type: "system"
      },
      {
        name: "contest_winner",
        title: "🥇 Chúc mừng chiến thắng!",
        content: "Xin chúc mừng! Bạn đã giành giải [GIẢI THƯỞNG] trong cuộc thi [TÊN CUỘC THI]. Phần thưởng sẽ được gửi đến bạn sớm nhất!",
        type: "personal"
      },
      {
        name: "contest_reminder",
        title: "⏳ Cuộc thi sắp kết thúc",
        content: "Cuộc thi [TÊN CUỘC THI] sẽ kết thúc vào [THỜI GIAN]. Đây là cơ hội cuối để tham gia và giành giải thưởng!",
        type: "system"
      },

      // Community Templates
      {
        name: "comment_reply",
        title: "💬 Có người trả lời bình luận của bạn",
        content: "[TÊN NGƯỜI DÙNG] đã trả lời bình luận của bạn: '[NỘI DUNG]'",
        type: "personal"
      },
      {
        name: "post_liked",
        title: "❤️ Bài viết của bạn được yêu thích",
        content: "[TÊN NGƯỜI DÙNG] đã thích bài viết '[TIÊU ĐỀ BÀI VIẾT]' của bạn.",
        type: "personal"
      },
      {
        name: "new_follower",
        title: "👥 Người theo dõi mới",
        content: "[TÊN NGƯỜI DÙNG] đã bắt đầu theo dõi bạn. Hãy kết nối và học tập cùng nhau nhé!",
        type: "personal"
      },

      // Premium Templates
      {
        name: "premium_upgrade",
        title: "⭐ Chào mừng thành viên Premium!",
        content: "Chúc mừng bạn đã nâng cấp lên tài khoản Premium! Giờ đây bạn có thể truy cập tất cả khóa học và tính năng cao cấp. Chúc bạn học tập hiệu quả!",
        type: "personal"
      },
      {
        name: "premium_expiring",
        title: "⚠️ Tài khoản Premium sắp hết hạn",
        content: "Tài khoản Premium của bạn sẽ hết hạn vào [NGÀY HẾT HẠN]. Gia hạn ngay để tiếp tục sử dụng các tính năng cao cấp!",
        type: "personal"
      },

      // Study Reminder Templates
      {
        name: "daily_study_reminder",
        title: "📖 Nhắc nhở học tập hàng ngày",
        content: "Đã đến giờ học rồi! Hãy dành 15-30 phút để ôn luyện tiếng Nhật hôm nay. Kiên trì mỗi ngày sẽ giúp bạn tiến bộ nhanh chóng!",
        type: "personal"
      },
      {
        name: "review_reminder",
        title: "🔄 Nhắc nhở ôn tập",
        content: "Bạn có [SỐ LƯỢNG] flashcard cần ôn tập hôm nay. Hãy dành thời gian để củng cố kiến thức nhé!",
        type: "personal"
      },
      {
        name: "quiz_available",
        title: "📝 Bài kiểm tra mới",
        content: "Bài kiểm tra '[TÊN BÀI KIỂM TRA]' đã sẵn sàng. Hãy thử sức để kiểm tra kiến thức của mình!",
        type: "personal"
      }
    ];

    await Template.insertMany(templates);
    console.log(`✅ Seeded ${templates.length} notification templates successfully!`);
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
};

// Run seed if called directly
if (require.main === module) {
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  
  dotenv.config();
  
  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/japanlearn")
    .then(async () => {
      console.log("📡 Connected to MongoDB");
      await seedTemplates();
      await mongoose.disconnect();
      console.log("✅ Seed completed and disconnected");
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("❌ MongoDB connection error:", error);
      process.exit(1);
    });
}

