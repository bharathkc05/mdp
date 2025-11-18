import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema({
  // Configuration key to ensure only one config document exists
  configKey: { 
    type: String, 
    required: true, 
    unique: true, 
    default: 'platform_config' 
  },
  
  // Minimum donation settings
  minimumDonation: {
    amount: { 
      type: Number, 
      required: true, 
      default: 1,
      min: 0.01 
    },
    enabled: { 
      type: Boolean, 
      default: true 
    }
  },
  
  // Currency settings
  currency: {
    code: { 
      type: String, 
      required: true, 
      default: 'INR',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
    },
    symbol: { 
      type: String, 
      required: true, 
      default: '$' 
    },
    position: { 
      type: String, 
      enum: ['before', 'after'], 
      default: 'before' 
    },
    decimalPlaces: { 
      type: Number, 
      default: 2,
      min: 0,
      max: 4
    },
    thousandsSeparator: { 
      type: String, 
      default: ',' 
    },
    decimalSeparator: { 
      type: String, 
      default: '.' 
    }
  },
  
  // Metadata
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Static method to get or create the platform config
platformConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne({ configKey: 'platform_config' });
  
  if (!config) {
    // Create default config if it doesn't exist
    config = await this.create({ 
      configKey: 'platform_config',
      minimumDonation: {
        amount: 1,
        enabled: true
      },
      currency: {
        code: 'USD',
        symbol: '$',
        position: 'before',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
      }
    });
  }
  
  return config;
};

// Static method to update the platform config
platformConfigSchema.statics.updateConfig = async function(updates, userId) {
  const config = await this.getConfig();
  
  // Update fields
  if (updates.minimumDonation) {
    config.minimumDonation = { ...config.minimumDonation, ...updates.minimumDonation };
  }
  
  if (updates.currency) {
    config.currency = { ...config.currency, ...updates.currency };
  }
  
  config.updatedBy = userId;
  config.updatedAt = new Date();
  
  await config.save();
  return config;
};

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);

export default PlatformConfig;
