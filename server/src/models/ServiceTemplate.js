const mongoose = require('mongoose');

const serviceTemplateSchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', default: null },
    estimatedDurationMinutes: { type: Number, min: 15, max: 10080, default: 60 },
    laborCost: { type: Number, min: 0, default: 0 },
    partsAllowance: { type: Number, min: 0, default: 0 },
    warrantyDays: { type: Number, min: 0, max: 3650, default: 0 },
    checklist: [{ type: String, trim: true, maxlength: 300 }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceTemplateSchema.index({ technician: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ServiceTemplate', serviceTemplateSchema);
