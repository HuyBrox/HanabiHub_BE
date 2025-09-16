import mongoose, { Schema, Model } from "mongoose";
import { IMessage } from "../types/message.types";

const messageSchema = new Schema<IMessage>({
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `User`,
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `User`,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Message: Model<IMessage> = mongoose.model<IMessage>(`Message`, messageSchema);
export default Message;