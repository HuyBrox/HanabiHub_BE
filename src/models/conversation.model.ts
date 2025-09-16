import mongoose, { Schema, Model } from "mongoose";
import { IConversation } from "../types/conversation.types";

const conversationSchema = new Schema<IConversation>({
    //nguời than gia
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: `User`,
        },
    ],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: `Message`,
        },
    ],
    //tin nhắn chưa xem
    unreadMessages: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            count: { type: Number, default: 0 }
        }
    ]

}, { timestamps: true });

const Conversation: Model<IConversation> = mongoose.model<IConversation>(`Conversation`, conversationSchema);
export default Conversation;