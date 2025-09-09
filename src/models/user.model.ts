import mongoose from 'mongoose';

interface IUser {
    fullname: string;
    username: string;
    email: string;
    password: string;
    avatar?: string;
    role?: 'user' | 'admin';
    phone?: string;
    address?: string;
    course?: mongoose.Schema.Types.ObjectId;
    lastActiveAt?: Date;
    posts?: number;
    likes?: number;
    recentActivity?: string[];
}

const UserSchema = new mongoose.Schema({
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
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin'],
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
    likes: {
        type: Number,
        default: 0,
    },
    recentActivity: [
        {
            type: String,
        }
    ],

}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;