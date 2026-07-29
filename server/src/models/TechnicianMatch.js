const mongoose = require('mongoose');

const technicianMatchSchema = new mongoose.Schema(
  {
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillScore: { type: Number, default: 0, min: 0, max: 100 },
    distanceScore: { type: Number, default: 0, min: 0, max: 100 },
    availabilityScore: { type: Number, default: 0, min: 0, max: 100 },
    ratingScore: { type: Number, default: 0, min: 0, max: 100 },
    experienceScore: { type: Number, default: 0, min: 0, max: 100 },
    completionScore: { type: Number, default: 0, min: 0, max: 100 },
    totalScore: { type: Number, default: 0, min: 0, max: 100 },
    explanation: { type: String, default: '' },
    status: {
      type: String,
      enum: ['generated', 'invited', 'accepted', 'declined', 'expired'],
      default: 'generated',
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

technicianMatchSchema.index({ repairRequest: 1, totalScore: -1 });
technicianMatchSchema.index({ technician: 1, status: 1 });

const TechnicianMatch = mongoose.model('TechnicianMatch', technicianMatchSchema);

module.exports = TechnicianMatch;
