import mongoose, { Schema, Document } from 'mongoose';

// Interface cho User document
export interface IUserDocument extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline: boolean;
  gamesPlayed: number;
  gamesWon: number;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const userSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  avatar: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  gamesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Games played cannot be negative']
  },
  gamesWon: {
    type: Number,
    default: 0,
    min: [0, 'Games won cannot be negative']
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Tự động tạo createdAt và updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Loại bỏ password khi convert sang JSON
      delete ret.password;
      return ret;
    }
  }
});

// Index cho tìm kiếm
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ lastActiveAt: 1 });

// Methods
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Virtuals
userSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.gamesWon / this.gamesPlayed) * 100 * 100) / 100; // Round to 2 decimal places
});

// Model
const User = mongoose.model<IUserDocument>('User', userSchema);

export default User;
