import mongoose, { Schema, Model } from 'mongoose';
import { IUser, UserLevel } from '@/types/user.types';

const UserSchema = new Schema<IUser>({
    fullname: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: 'https://png.pngtree.com/png-vector/20190623/ourlarge/pngtree-accountavataruser--flat-color-icon--vector-icon-banner-templ-png-image_1491720.jpg',
    },
    bio: {
        type: String,
        max: 300,
        default: '',
    },
    phone: {
        type: String,
    },
    address: {
        type: String,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
    },
    lastActiveAt: {
        type: Date,
        default: Date.now,
    },
    posts: {
        type: Number,
        default: 0,
    },
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    //trình độ học vấn
    level: {
        type: String,
        enum: ['N5', 'N4', 'N3', 'N2', 'N1'] as UserLevel[],
        default: 'N5' as UserLevel,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
        default: null,
    },

    // Hoạt động gần đây
    // recentActivity: [
    //     {
    //         type: String,
    //     }
    // ],

}, { timestamps: true });

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;