import mongoose, { Schema, Model } from "mongoose";
import { IPost } from "../types/post.types";

const postSchema = new Schema<IPost>({
    caption: {
        type: String,
        max: 500,
        default: "",
    },
    images: [{
        type: String,
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `User`,
        required: true,
    },
    desc: {
        type: String,
        max: 500,
    },

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: `User`,
        }
    ],
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: `Comment`,
        }
    ],

}, { timestamps: true });

const Post: Model<IPost> = mongoose.model<IPost>(`Post`, postSchema);
export default Post;