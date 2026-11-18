const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    repairJob: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairJob', required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    currency: { type: String, default: 'BDT', trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    lineItems: [{
      description: { type: String, required: true, trim: true, maxlength: 300 },
      quantity: { type: Number, min: 0, default: 1 },
      unitAmount: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, default: 0 },
    }],
    subtotal: { type: Number, min: 0, default: 0 },
    amountPaid: { type: Number, min: 0, default: 0 },
    amountRefunded: { type: Number, min: 0, default: 0 },
    balanceDue: { type: Number, min: 0, default: 0 },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ technician: 1, issuedAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
