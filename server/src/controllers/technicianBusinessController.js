const mongoose = require('mongoose');
const { ServiceTemplate, Invoice, RepairJob, PaymentTransaction, User } = require('../models');
const { PAYMENT_TRANSACTION_STATUS, ROLES } = require('../constants');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');

const hasId = (value, id) => value && value.toString() === id.toString();

const listServiceTemplates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { technician: req.user.userId };
  if (req.query.active === 'true') query.active = true;
  if (req.query.active === 'false') query.active = false;
  const [templates, total] = await Promise.all([
    ServiceTemplate.find(query).populate('category', 'name icon').sort({ active: -1, updatedAt: -1 }).skip(skip).limit(limit),
    ServiceTemplate.countDocuments(query),
  ]);
  return successResponse(res, { templates, pagination: paginationMeta(total, page, limit) });
});

const createServiceTemplate = asyncHandler(async (req, res) => {
  const template = await ServiceTemplate.create({
    ...req.body,
    category: req.body.category || null,
    technician: req.user.userId,
  });
  return successResponse(res, { template }, 'Service template created.', 201);
});

const updateServiceTemplate = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid service template ID.', 400);
  const updates = { ...req.body };
  if (updates.category === '') updates.category = null;
  const template = await ServiceTemplate.findOneAndUpdate(
    { _id: req.params.id, technician: req.user.userId },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('category', 'name icon');
  if (!template) return errorResponse(res, 'Service template not found.', 404);
  return successResponse(res, { template }, 'Service template updated.');
});

const deleteServiceTemplate = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid service template ID.', 400);
  const template = await ServiceTemplate.findOneAndDelete({ _id: req.params.id, technician: req.user.userId });
  if (!template) return errorResponse(res, 'Service template not found.', 404);
  return successResponse(res, null, 'Service template deleted.');
});

const getCustomerHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const rows = await RepairJob.aggregate([
    { $match: { technician: new mongoose.Types.ObjectId(req.user.userId) } },
    { $sort: { updatedAt: -1 } },
    { $group: {
      _id: '$owner',
      totalJobs: { $sum: 1 },
      completedJobs: { $sum: { $cond: [{ $eq: ['$currentStatus', 'completed'] }, 1, 0] } },
      lifetimeValue: { $sum: { $subtract: ['$paymentSummary.confirmedPaid', '$paymentSummary.confirmedRefunded'] } },
      lastJobAt: { $max: '$updatedAt' },
      lastJobStatus: { $first: '$currentStatus' },
      lastRepairJob: { $first: '$_id' },
    } },
    { $sort: { lastJobAt: -1 } },
    { $facet: { data: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  const customers = rows[0]?.data || [];
  const users = await User.find({ _id: { $in: customers.map((customer) => customer._id) } })
    .select('fullName profileImage city').lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const total = rows[0]?.total?.[0]?.count || 0;
  return successResponse(res, {
    customers: customers.map((customer) => ({
      ...customer,
      customer: usersById.get(customer._id.toString()) || null,
    })),
    pagination: paginationMeta(total, page, limit),
  });
});

const getEarningsAnalytics = asyncHandler(async (req, res) => {
  const periods = { '7d': 7, '30d': 30, '90d': 90, year: 365 };
  const period = req.query.period || '30d';
  const since = new Date();
  since.setDate(since.getDate() - periods[period]);
  const match = {
    technician: new mongoose.Types.ObjectId(req.user.userId),
    createdAt: { $gte: since },
    $or: [
      { type: 'payment', status: PAYMENT_TRANSACTION_STATUS.CONFIRMED },
      { type: 'refund', status: PAYMENT_TRANSACTION_STATUS.REFUNDED },
    ],
  };
  const [summaryRows, timeline, customerCount] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        grossEarnings: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
        refunds: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] } },
        paymentCount: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, 1, 0] } },
        currency: { $first: '$currency' },
      } },
    ]),
    PaymentTransaction.aggregate([
      { $match: match },
      { $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, currency: '$currency' },
        payments: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
        refunds: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] } },
      } },
      { $project: { _id: 0, date: '$_id.day', currency: '$_id.currency', payments: 1, refunds: 1, net: { $subtract: ['$payments', '$refunds'] } } },
      { $sort: { date: 1 } },
    ]),
    RepairJob.distinct('owner', { technician: req.user.userId }),
  ]);
  const summary = summaryRows[0] || { grossEarnings: 0, refunds: 0, paymentCount: 0, currency: 'BDT' };
  return successResponse(res, {
    period,
    since,
    summary: { ...summary, netEarnings: summary.grossEarnings - summary.refunds, uniqueCustomers: customerCount.length },
    timeline,
  });
});

const buildInvoiceLines = (job) => {
  const lines = [];
  if (job.finalLaborCost > 0) lines.push({ description: 'Repair labor', quantity: 1, unitAmount: job.finalLaborCost, total: job.finalLaborCost });
  if (job.finalPartsCost > 0) lines.push({ description: 'Parts and materials', quantity: 1, unitAmount: job.finalPartsCost, total: job.finalPartsCost });
  if (!lines.length && job.finalTotalCost > 0) lines.push({ description: 'Repair service', quantity: 1, unitAmount: job.finalTotalCost, total: job.finalTotalCost });
  return lines;
};

const createOrRefreshInvoice = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid repair job ID.', 400);
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  if (req.user.role !== ROLES.ADMIN && !hasId(job.technician, req.user.userId)) return errorResponse(res, 'Access denied.', 403);
  const lineItems = buildInvoiceLines(job);
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  if (!subtotal) return errorResponse(res, 'Set the final repair cost before issuing an invoice.', 409);
  const invoiceNumber = `FT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${job._id.toString().slice(-8).toUpperCase()}`;
  const invoice = await Invoice.findOneAndUpdate(
    { repairJob: job._id },
    {
      $set: {
        owner: job.owner,
        technician: job.technician,
        invoiceNumber,
        currency: job.paymentSummary?.currency || 'BDT',
        lineItems,
        subtotal,
        amountPaid: job.paymentSummary?.confirmedPaid || 0,
        amountRefunded: job.paymentSummary?.confirmedRefunded || 0,
        balanceDue: Math.max(0, subtotal - (job.paymentSummary?.confirmedPaid || 0) + (job.paymentSummary?.confirmedRefunded || 0)),
        note: req.body.note || '',
      },
      $setOnInsert: { issuedAt: new Date() },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return successResponse(res, { invoice }, 'Invoice generated from the verified repair and payment records.');
});

const listMyInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [invoices, total] = await Promise.all([
    Invoice.find({ technician: req.user.userId }).populate('owner', 'fullName profileImage').populate({ path: 'repairJob', select: 'currentStatus repairRequest', populate: { path: 'repairRequest', select: 'item', populate: { path: 'item', select: 'title' } } }).sort({ issuedAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments({ technician: req.user.userId }),
  ]);
  return successResponse(res, { invoices, pagination: paginationMeta(total, page, limit) });
});

const getInvoiceForRepairJob = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return errorResponse(res, 'Invalid repair job ID.', 400);
  const job = await RepairJob.findById(req.params.id);
  if (!job) return errorResponse(res, 'Repair job not found.', 404);
  const canAccess = req.user.role === ROLES.ADMIN || hasId(job.owner, req.user.userId) || hasId(job.technician, req.user.userId);
  if (!canAccess) return errorResponse(res, 'Access denied.', 403);
  const invoice = await Invoice.findOne({ repairJob: job._id }).populate('owner', 'fullName').populate('technician', 'fullName');
  if (!invoice) return errorResponse(res, 'No invoice has been generated for this repair job.', 404);
  return successResponse(res, { invoice });
});

module.exports = {
  listServiceTemplates,
  createServiceTemplate,
  updateServiceTemplate,
  deleteServiceTemplate,
  getCustomerHistory,
  getEarningsAnalytics,
  createOrRefreshInvoice,
  listMyInvoices,
  getInvoiceForRepairJob,
};
