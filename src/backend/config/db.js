import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set in .env");
    await mongoose.connect(uri);
    console.log(" MongoDB Connected");
  } catch (error) {
    console.error(" MongoDB Connection Failed", error.message);
    process.exit(1);
  }
};

export default connectDB;
