const { Item } = require('../models');
const { asyncHandler, successResponse, errorResponse, parsePagination, paginationMeta } = require('../utils/helpers');
const uploadService = require('../services/uploadService');

const createItem = asyncHandler(async (req, res) => {
  const itemData = { ...req.body, owner: req.user.userId };
  const item = await Item.create(itemData);
  return successResponse(res, { item }, 'Item created', 201);
});

const getItems = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, status, search } = req.query;
  const query = { owner: req.user.userId };
  if (category) query.category = category;
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const [items, total] = await Promise.all([
    Item.find(query).populate('category', 'name icon').populate('subcategory', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Item.countDocuments(query),
  ]);
  return successResponse(res, { items, pagination: paginationMeta(total, page, limit) });
});

const getItemById = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
    .populate('category', 'name icon riskLevel').populate('subcategory', 'name').populate('owner', 'fullName');
  if (!item) return errorResponse(res, 'Item not found.', 404);

  // Only owner or admin can see full details
  if (item.owner._id.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
    // Return limited info for non-owners
    const limitedItem = item.toJSON();
    delete limitedItem.serialNumberPrivate;
    return successResponse(res, { item: limitedItem });
  }
  return successResponse(res, { item });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!item) return errorResponse(res, 'Item not found.', 404);

  const fields = ['title', 'category', 'subcategory', 'brand', 'model', 'approximateAge',
    'condition', 'serialNumberPrivate', 'ownershipDeclaration', 'approximateLocation', 'currentPathway', 'status'];
  fields.forEach((f) => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  await item.save();

  return successResponse(res, { item }, 'Item updated');
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!item) return errorResponse(res, 'Item not found.', 404);
  item.status = 'removed';
  await item.save();
  return successResponse(res, null, 'Item removed');
});

const uploadItemImages = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!item) return errorResponse(res, 'Item not found.', 404);

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, 'No images provided.', 400);
  }

  const uploaded = await uploadService.uploadMultiple(req.files, { folder: 'fixtogether/items' });
  const newImages = uploaded.map((u) => ({ url: u.url, publicId: u.publicId, uploadedAt: new Date() }));
  item.images.push(...newImages);
  await item.save();

  return successResponse(res, { images: item.images }, 'Images uploaded');
});

module.exports = { createItem, getItems, getItemById, updateItem, deleteItem, uploadItemImages };
