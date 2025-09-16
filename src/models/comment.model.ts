import mongoose, { Schema, Model } from "mongoose";
import { IComment, CommentTargetModel } from "../types/comment.types";

// Định nghĩa schema cho Comment
const commentSchema = new Schema<IComment>({
    // Nội dung bình luận
    text: {
        type: String,
        required: true,
    },
    // Người viết bình luận (liên kết tới User)
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `User`,
        required: true,
    },
    // Danh sách user đã like bình luận này
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: `User`,
        }
    ],
    // Id của bình luận cha (nếu là trả lời)
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    // Điểm số (ví dụ upvote/downvote)
    score: {
        type: Number,
        default: 0
    },
    // Độ sâu của bình luận (0 = gốc, 1 = trả lời, 2 = trả lời lồng, ...)
    depth: {
        type: Number,
        default: 0
    },
    // Tên model mà comment đang gắn tới (có thể là Post hoặc Lesson)
    targetModel: {
        type: String,
        enum: ['Post', 'Lesson'] as CommentTargetModel[],
        required: true,
    },
    // Id của Post hoặc Lesson tương ứng
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel',
        required: true,
    }

}, { timestamps: true });

// Thêm index để query nhanh hơn theo target và parent -> nghĩa là lấy comment theo Post/Lesson và lấy replies theo parentId
commentSchema.index({ targetModel: 1, targetId: 1 });
commentSchema.index({ parentId: 1 });

// Materialized path: lưu đường dẫn từ gốc tới node hiện tại
commentSchema.add({
    path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});
commentSchema.index({ path: 1 });

// Virtual field: replies (không lưu trong DB, chỉ populate khi cần)
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentId',
    justOne: false
});

// Cho phép toObject/toJSON trả luôn field virtual
commentSchema.set('toObject', { virtuals: true });
commentSchema.set('toJSON', { virtuals: true });

// Hook chạy trước khi lưu comment
commentSchema.pre('save', async function (next) {
    const doc: any = this;

    // Nếu comment không mới và không thay đổi parentId thì bỏ qua
    if (!doc.isNew && !doc.isModified('parentId')) return next();

    // Nếu là comment gốc (không có parent)
    if (!doc.parentId) {
        doc.path = [];
        doc.depth = 0;
        return next();
    }

    try {
        // Lấy thông tin parent để tính toán path và depth
        const parent: any = await mongoose
            .model('Comment')
            .findById(doc.parentId)
            .select('path depth')
            .lean();

        if (!parent) {
            // Nếu không tìm thấy parent thì coi như comment gốc
            doc.path = [];
            doc.depth = 0;
            return next();
        }

        // Path = path của parent + id của parent
        doc.path = (parent.path || []).concat([parent._id]);
        // Depth = depth của parent + 1
        doc.depth = (parent.depth || 0) + 1;
        return next();
    } catch (err: any) {
        return next(err as any);
    }
});

// Tạo model Comment
const Comment: Model<IComment> = mongoose.model<IComment>(`Comment`, commentSchema);

export default Comment;

