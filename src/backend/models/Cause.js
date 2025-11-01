import mongoose from "mongoose";

const causeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  category: {
    type: String,
    enum: ['education', 'healthcare', 'environment', 'disaster-relief', 'poverty', 'animal-welfare', 'other'],
    default: 'other'
  },
  targetAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  currentAmount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  imageUrl: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  donorCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true 
});

// Virtual for calculating percentage of target achieved
causeSchema.virtual('percentageAchieved').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.round((this.currentAmount / this.targetAmount) * 100);
});

// Ensure virtuals are included in JSON output
causeSchema.set('toJSON', { virtuals: true });
causeSchema.set('toObject', { virtuals: true });

const Cause = mongoose.model("Cause", causeSchema);
export default Cause;
