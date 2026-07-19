const mongoose = require('mongoose');

const onDemandOrderSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'companyName is required'],
    trim: true
  },
  jugCount: {
    type: Number,
    validate: {
      validator: function (value) {
        return value === undefined || value === null || (Number.isInteger(value) && value > 0);
      },
      message: 'jugCount must be a positive integer when provided'
    }
  },
  deliveryDate: {
    type: Date,
    required: [true, 'deliveryDate is required']
  },
  requestedDate: {
    type: Date,
    required: [true, 'requestedDate is required']
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'pending'
  },
  deliveryFeeAmount: {
    type: Number,
    default: 6.99
  },
  feeApplied: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

onDemandOrderSchema.pre('validate', function (next) {
  if (!this.deliveryDate && !this.requestedDate) {
    this.invalidate('deliveryDate', 'deliveryDate is required');
    this.invalidate('requestedDate', 'requestedDate is required');
    return next();
  }

  const selectedDate = this.deliveryDate || this.requestedDate;
  const now = new Date();
  const minimumAllowedDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  if (selectedDate < minimumAllowedDate) {
    this.invalidate('deliveryDate', 'deliveryDate must be at least 48 hours from the current server time');
    this.invalidate('requestedDate', 'requestedDate must be at least 48 hours from the current server time');
  }

  if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
    this.invalidate('deliveryDate', 'deliveryDate cannot be Saturday or Sunday');
    this.invalidate('requestedDate', 'requestedDate cannot be Saturday or Sunday');
  }

  next();
});

module.exports = mongoose.model('OnDemandOrder', onDemandOrderSchema);
