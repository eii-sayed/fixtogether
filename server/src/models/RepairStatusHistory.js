const mongoose = require('mongoose');

const repairStatusHistorySchema = new mongoose.Schema(
  {
    repairJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairJob',
      required: true,
      index: true,
    },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: { type: String, default: '', maxlength: 1000 },
    evidence: [
      {
        url: { type: String },
        publicId: { type: String, default: '' },
      },
    ],
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

repairStatusHistorySchema.index({ repairJob: 1, timestamp: 1 });

const RepairStatusHistory = mongoose.model('RepairStatusHistory', repairStatusHistorySchema);

module.exports = RepairStatusHistory;
