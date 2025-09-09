import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(mongoUri);
        console.log("👌Connected to MongoDB");
    } catch (error) {
        console.log("❌Error connecting to MongoDB:", error);
    }
}
export default connectDB;