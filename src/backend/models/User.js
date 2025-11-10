import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['donor', 'admin'], default: 'donor' },
  verified: { type: Boolean, default: false },
  donations: [donationSchema],
  profile: {
    phoneNumber: String,
    address: String,
    preferredCauses: [String]
  },
  resetToken: String,
  resetTokenExpiry: Date,
  // Token blacklist for logout functionality
  tokenBlacklist: [{ 
    token: String, 
    expiresAt: Date 
  }],
  // Track last activity for session timeout
  lastActivity: { type: Date, default: Date.now },
  // Two-Factor Authentication fields
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  backupCodes: [{ 
    code: String, 
    used: { type: Boolean, default: false } 
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
