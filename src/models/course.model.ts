import e from 'connect-flash';
import mongoose from 'mongoose';
import { de } from 'zod/v4/locales/index.cjs';

const CourseSchema = new mongoose.Schema({
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
        ref: 'User',
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
            ref: 'Lesson',
        },
    ],
    thumbnail: {
        type: String,
        default: 'https://i.postimg.cc/LXt5Hbnf/image.png',
        required: false,
    },
    //sao
    averageRating: {
        type: Number,
        default: 5,
        max: 5,
        min: 0,
    },

}, { timestamps: true });

const Course = mongoose.model('Course', CourseSchema);
export default Course;