import mongoose, { Schema, Model } from "mongoose";
import { ILesson, LessonType } from '@/types/lesson.types';
import Comment from "./comment.model";

const lessonSchema = new Schema<ILesson>({
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['video', 'task'] as LessonType[],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    jsonTask: {
        type: mongoose.Schema.Types.Mixed, //JSON
        default: null,
    },
    videoUrl: {
        type: String,
    },
    Comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Comment,
    }],
});


lessonSchema.pre('save', function (next) {
    if (this.type === 'task' && !this.jsonTask) {
        return next(new Error("jsonTask is required for task type"));
    }
    if (this.type === 'video' && !this.videoUrl) {
        return next(new Error("videoUrl is required for video type"));
    }
    next();
});

const Lesson: Model<ILesson> = mongoose.model<ILesson>('Lesson', lessonSchema);
export default Lesson;