const { ItemCategory, Skill } = require('../models');
const { asyncHandler, successResponse, errorResponse, slugify } = require('../utils/helpers');

// ---- Categories ----
const getCategories = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const query = {};
  if (active !== undefined) query.active = active === 'true';
  const categories = await ItemCategory.find(query).populate('parent', 'name slug').sort({ sortOrder: 1, name: 1 });
  return successResponse(res, { categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, parent, description, icon, riskLevel, allowedServiceTypes, defaultQuestions, prohibitedAIAdvice } = req.body;
  const slug = slugify(name);
  const existing = await ItemCategory.findOne({ slug });
  if (existing) return errorResponse(res, 'Category with this name already exists.', 409);
  const category = await ItemCategory.create({ name, slug, parent: parent || null, description, icon, riskLevel, allowedServiceTypes, defaultQuestions, prohibitedAIAdvice });
  return successResponse(res, { category }, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const updates = {};
  const fields = ['name', 'description', 'icon', 'riskLevel', 'active', 'sortOrder', 'allowedServiceTypes', 'defaultQuestions', 'prohibitedAIAdvice', 'parent'];
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.name) updates.slug = slugify(updates.name);
  const category = await ItemCategory.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!category) return errorResponse(res, 'Category not found.', 404);
  return successResponse(res, { category }, 'Category updated');
});

const deactivateCategory = asyncHandler(async (req, res) => {
  const category = await ItemCategory.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!category) return errorResponse(res, 'Category not found.', 404);
  return successResponse(res, { category }, 'Category deactivated');
});

// ---- Skills ----
const getSkills = asyncHandler(async (req, res) => {
  const { active, category } = req.query;
  const query = {};
  if (active !== undefined) query.active = active === 'true';
  if (category) query.category = category;
  const skills = await Skill.find(query).populate('category', 'name').sort({ name: 1 });
  return successResponse(res, { skills });
});

const createSkill = asyncHandler(async (req, res) => {
  const { name, description, category } = req.body;
  const slug = slugify(name);
  const existing = await Skill.findOne({ slug });
  if (existing) return errorResponse(res, 'Skill already exists.', 409);
  const skill = await Skill.create({ name, slug, description, category: category || null });
  return successResponse(res, { skill }, 'Skill created', 201);
});

const updateSkill = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name) { updates.name = req.body.name; updates.slug = slugify(req.body.name); }
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.active !== undefined) updates.active = req.body.active;
  const skill = await Skill.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!skill) return errorResponse(res, 'Skill not found.', 404);
  return successResponse(res, { skill }, 'Skill updated');
});

module.exports = { getCategories, createCategory, updateCategory, deactivateCategory, getSkills, createSkill, updateSkill };
