import mongoose from "mongoose";
import User from "./user.model";
const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      max: 500,
    },
    //instructor là giảng viên của khóa học, tham chiếu đến model User
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    //price là giá của khóa học, mặc định là 0
    price: {
      type: Number,
      default: 0,
    },
    //lessons là mảng chứa các bài học
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    //students là mảng chứa các học viên đăng ký khóa học
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    thumbnail: {
      type: String,
      default: "https://i.postimg.cc/LXt5Hbnf/image.png",
      required: false,
    },
    //sao
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: User,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", CourseSchema);
export default Course;
