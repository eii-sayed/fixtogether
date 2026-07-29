const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      default: 'Home',
      trim: true,
    },
    division: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    approximateAddress: { type: String, trim: true, default: '' },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    isDefault: { type: Boolean, default: false },
    privacy: {
      showExactLocation: { type: Boolean, default: false },
      showCity: { type: Boolean, default: true },
      showArea: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

addressSchema.index({ coordinates: '2dsphere' });
addressSchema.index({ user: 1, isDefault: 1 });

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
