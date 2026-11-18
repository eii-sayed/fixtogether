const { RepairJob, PaymentTransaction, Dispute, Invoice } = require('../models');
const {
  ROLES,
  PAYMENT_TRANSACTION_STATUS,
  NOTIFICATION_TYPES,
  DISPUTE_CATEGORIES,
  DISPUTE_STATUS,
} = require('../constants');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLog');
const { withTransaction } = require('../utils/transaction');

const createHttpError = (status, message) => Object.assign(new Error(message), { status });
const hasId = (value, id) => value && value.toString() === id.toString();
const isAdmin = (user) => user.role === ROLES.ADMIN;
const isOwner = (job, user) => hasId(job.owner, user.userId);
const isTechnician = (job, user) => hasId(job.technician, user.userId);
const canAccessLedger = (job, user) => isAdmin(user) || isOwner(job, user) || isTechnician(job, user);

const refreshPaymentSummary = async (job, session) => {
  const transactions = await PaymentTransaction.find({ repairJob: job._id }).session(session);
  const confirmedPaid = transactions
    .filter((entry) => entry.type === 'payment' && entry.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const confirmedRefunded = transactions
    .filter((entry) => entry.type === 'refund' && entry.status === PAYMENT_TRANSACTION_STATUS.REFUNDED)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const balanceOutstanding = Math.max(0, (job.finalTotalCost || 0) - confirmedPaid + confirmedRefunded);

  job.paymentSummary = {
    confirmedPaid,
    confirmedRefunded,
    balanceOutstanding,
    currency: transactions[0]?.currency || 'BDT',
    updatedAt: new Date(),
  };
  job.paymentStatus = confirmedPaid === 0
    ? 'pending'
    : confirmedRefunded >= confirmedPaid
      ? 'refunded'
      : balanceOutstanding > 0
        ? 'partial'
        : 'paid';
  await job.save({ session });
  // An invoice is an operational snapshot. Keep its settlement figures in
  // sync with the confirmed ledger without letting a request body alter them.
  await Invoice.updateOne(
    { repairJob: job._id },
    {
      $set: {
        amountPaid: confirmedPaid,
        amountRefunded: confirmedRefunded,
        balanceDue: Math.max(0, (job.finalTotalCost || 0) - confirmedPaid + confirmedRefunded),
      },
    },
    { session }
  );
  return job;
};

const getPaymentLedger = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (!canAccessLedger(job, req.user)) return errorResponse(res, 'Access denied.', 403);

  const transactions = await PaymentTransaction.find({ repairJob: job._id })
    .populate('recordedBy', 'fullName profileImage')
    .populate('reviewedBy', 'fullName profileImage')
    .populate('originalPayment', 'amount currency paymentMethod reference status')
    .sort({ createdAt: -1 });
  return successResponse(res, { paymentSummary: job.paymentSummary, paymentStatus: job.paymentStatus, transactions });
});

const recordPayment = asyncHandler(async (req, res) => {
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (!isAdmin(req.user) && !isOwner(job, req.user)) {
    return errorResponse(res, 'Only the owner can record a payment.', 403);
  }

  const payment = await PaymentTransaction.create({
    repairJob: job._id,
    owner: job.owner,
    technician: job.technician,
    type: 'payment',
    amount: req.body.amount,
    currency: req.body.currency,
    paymentMethod: req.body.paymentMethod,
    reference: req.body.reference,
    note: req.body.note,
    status: PAYMENT_TRANSACTION_STATUS.PENDING,
    recordedBy: req.user.userId,
  });

  await createNotification({
    userId: job.technician,
    type: NOTIFICATION_TYPES.PAYMENT_RECORDED,
    title: 'Payment Recorded',
    message: 'The owner recorded a payment. Confirm it after you verify receipt.',
    relatedEntityType: 'RepairJob',
    relatedEntityId: job._id,
  });
  await createAuditLog({
    actor: req.user.userId, action: 'PAYMENT_RECORDED', targetType: 'PaymentTransaction', targetId: payment._id,
    metadata: { repairJob: job._id, amount: payment.amount, currency: payment.currency },
  }, req);
  return successResponse(res, { payment }, 'Payment recorded and awaiting technician confirmation.', 201);
});

const decidePayment = asyncHandler(async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const job = await RepairJob.findById(req.params.id).session(session);
      if (!job) throw createHttpError(404, 'Repair job not found.');
      if (!isAdmin(req.user) && !isTechnician(job, req.user)) {
        throw createHttpError(403, 'Only the assigned technician can confirm a payment.');
      }
      const payment = await PaymentTransaction.findOne({ _id: req.params.paymentId, repairJob: job._id }).session(session);
      if (!payment) throw createHttpError(404, 'Payment record not found.');
      if (payment.type !== 'payment' || payment.status !== PAYMENT_TRANSACTION_STATUS.PENDING) {
        throw createHttpError(409, 'This payment is not awaiting confirmation.');
      }
      payment.status = req.body.decision === 'confirmed'
        ? PAYMENT_TRANSACTION_STATUS.CONFIRMED
        : PAYMENT_TRANSACTION_STATUS.REJECTED;
      payment.reviewedBy = req.user.userId;
      payment.reviewedAt = new Date();
      payment.decisionNote = req.body.note;
      await payment.save({ session });
      if (payment.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED) await refreshPaymentSummary(job, session);
      return { job, payment };
    });

    await createNotification({
      userId: result.job.owner,
      type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
      title: result.payment.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED ? 'Payment Confirmed' : 'Payment Rejected',
      message: result.payment.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED
        ? 'The technician confirmed your payment.'
        : 'The technician could not confirm the recorded payment. Review the payment reference or open a dispute.',
      relatedEntityType: 'RepairJob',
      relatedEntityId: result.job._id,
    });
    await createAuditLog({
      actor: req.user.userId, action: `PAYMENT_${result.payment.status.toUpperCase()}`,
      targetType: 'PaymentTransaction', targetId: result.payment._id,
      metadata: { repairJob: result.job._id, note: result.payment.decisionNote },
    }, req);
    return successResponse(res, { payment: result.payment, paymentSummary: result.job.paymentSummary }, 'Payment decision recorded.');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const requestRefund = asyncHandler(async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const job = await RepairJob.findById(req.params.id).session(session);
      if (!job) throw createHttpError(404, 'Repair job not found.');
      if (!isAdmin(req.user) && !isTechnician(job, req.user)) {
        throw createHttpError(403, 'Only the assigned technician can propose a refund.');
      }
      const payment = await PaymentTransaction.findOne({
        _id: req.params.paymentId,
        repairJob: job._id,
        type: 'payment',
        status: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
      }).session(session);
      if (!payment) throw createHttpError(404, 'Confirmed payment record not found.');
      const previousRefunds = await PaymentTransaction.find({
        originalPayment: payment._id,
        status: { $in: [PAYMENT_TRANSACTION_STATUS.REFUND_REQUESTED, PAYMENT_TRANSACTION_STATUS.REFUNDED] },
      }).session(session);
      const alreadyRequested = previousRefunds.reduce((sum, entry) => sum + entry.amount, 0);
      if (req.body.amount > payment.amount - alreadyRequested) {
        throw createHttpError(409, 'The requested refund exceeds the remaining refundable payment amount.');
      }
      const [refund] = await PaymentTransaction.create([{
        repairJob: job._id,
        owner: job.owner,
        technician: job.technician,
        type: 'refund',
        amount: req.body.amount,
        currency: payment.currency,
        paymentMethod: req.body.paymentMethod,
        reference: req.body.reference,
        note: req.body.note,
        status: PAYMENT_TRANSACTION_STATUS.REFUND_REQUESTED,
        originalPayment: payment._id,
        recordedBy: req.user.userId,
      }], { session });
      return { job, refund };
    });

    await createNotification({
      userId: result.job.owner,
      type: NOTIFICATION_TYPES.REFUND_REQUESTED,
      title: 'Refund Ready for Confirmation',
      message: 'The technician recorded a refund. Confirm receipt or dispute it if the funds were not received.',
      relatedEntityType: 'RepairJob',
      relatedEntityId: result.job._id,
    });
    return successResponse(res, { refund: result.refund }, 'Refund recorded and awaiting owner confirmation.', 201);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

const decideRefund = asyncHandler(async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const job = await RepairJob.findById(req.params.id).session(session);
      if (!job) throw createHttpError(404, 'Repair job not found.');
      if (!isAdmin(req.user) && !isOwner(job, req.user)) {
        throw createHttpError(403, 'Only the owner can confirm or dispute a refund.');
      }
      const refund = await PaymentTransaction.findOne({
        _id: req.params.refundId,
        repairJob: job._id,
        type: 'refund',
        status: PAYMENT_TRANSACTION_STATUS.REFUND_REQUESTED,
      }).session(session);
      if (!refund) throw createHttpError(404, 'Refund record not found.');

      refund.status = req.body.decision === 'confirmed'
        ? PAYMENT_TRANSACTION_STATUS.REFUNDED
        : PAYMENT_TRANSACTION_STATUS.DISPUTED;
      refund.reviewedBy = req.user.userId;
      refund.reviewedAt = new Date();
      refund.decisionNote = req.body.note;
      await refund.save({ session });
      if (refund.status === PAYMENT_TRANSACTION_STATUS.REFUNDED) await refreshPaymentSummary(job, session);

      let dispute = null;
      if (refund.status === PAYMENT_TRANSACTION_STATUS.DISPUTED) {
        [dispute] = await Dispute.create([{
          repairJob: job._id,
          openedBy: job.owner,
          againstUser: job.technician,
          category: DISPUTE_CATEGORIES.COST,
          description: `Refund dispute for ${refund.currency} ${refund.amount}. ${req.body.note || 'Owner reports that the refund was not received.'}`,
          status: DISPUTE_STATUS.OPEN,
        }], { session });
      }
      return { job, refund, dispute };
    });

    await createNotification({
      userId: result.job.technician,
      type: NOTIFICATION_TYPES.REFUND_RESOLVED,
      title: result.refund.status === PAYMENT_TRANSACTION_STATUS.REFUNDED ? 'Refund Confirmed' : 'Refund Disputed',
      message: result.refund.status === PAYMENT_TRANSACTION_STATUS.REFUNDED
        ? 'The owner confirmed receipt of the refund.'
        : 'The owner disputed the refund. A cost dispute has been opened for review.',
      relatedEntityType: result.dispute ? 'Dispute' : 'RepairJob',
      relatedEntityId: result.dispute?._id || result.job._id,
    });
    return successResponse(res, {
      refund: result.refund,
      dispute: result.dispute,
      paymentSummary: result.job.paymentSummary,
    }, result.dispute ? 'Refund disputed and escalated.' : 'Refund confirmed.');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    throw error;
  }
});

module.exports = { getPaymentLedger, recordPayment, decidePayment, requestRefund, decideRefund };
