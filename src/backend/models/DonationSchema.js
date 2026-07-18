import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  // Keep human-readable cause name for backwards compatibility
  cause: { type: String, required: true },
  // Reference to Cause document for better relations
  causeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cause' },
  // Payment details (optional when payment is simulated)
  paymentId: { type: String },
  paymentMethod: { type: String },
  status: { type: String, enum: ['pending','completed','failed'], default: 'completed' },
  date: { type: Date, default: Date.now }
}, { _id: false });

export default donationSchema;
