const mongoose = require('mongoose');
const { PAYMENT_TRANSACTION_STATUS } = require('../constants');

const paymentTransactionSchema = new mongoose.Schema(
  {
    repairJob: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairJob', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['payment', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'BDT', trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'mobile_payment', 'other'], required: true },
    reference: { type: String, trim: true, maxlength: 200, default: '' },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: Object.values(PAYMENT_TRANSACTION_STATUS), required: true },
    originalPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', default: null },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ repairJob: 1, type: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ originalPayment: 1, status: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
