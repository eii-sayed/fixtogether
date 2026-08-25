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
  if (req.body.alternativeTerms !== undefined) updates.alternativeTerms = req.body.alternativeTerms;
  if (req.body.verificationRequirement !== undefined) updates.verificationRequirement = req.body.verificationRequirement;
  const skill = await Skill.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!skill) return errorResponse(res, 'Skill not found.', 404);
  return successResponse(res, { skill }, 'Skill updated');
});

const mergeSkills = asyncHandler(async (req, res) => {
  const { sourceSkillId, targetSkillId } = req.body;
  if (sourceSkillId.toString() === targetSkillId.toString()) {
    return errorResponse(res, 'Source and target skills cannot be identical.', 400);
  }

  const [source, target] = await Promise.all([
    Skill.findById(sourceSkillId),
    Skill.findById(targetSkillId),
  ]);

  if (!source || !target) return errorResponse(res, 'Skill not found.', 404);

  // Re-link references in technician profiles
  const { TechnicianProfile } = require('../models');
  await TechnicianProfile.updateMany(
    { skills: source._id },
    { $addToSet: { skills: target._id }, $pull: { skills: source._id } }
  );

  source.active = false;
  source.mergeTarget = target._id;
  await source.save();

  return successResponse(res, { source, target }, `Merged "${source.name}" into "${target.name}"`);
});

const getTaxonomyImpact = asyncHandler(async (req, res) => {
  const { type, id } = req.params; // type = 'category' | 'skill'
  const { RepairRequest, RepairJob, TechnicianProfile, Item } = require('../models');

  let impact = { affectedRequests: 0, affectedJobs: 0, affectedTechnicians: 0, affectedItems: 0 };

  if (type === 'category') {
    const [reqCount, jobCount, techCount, itemCount] = await Promise.all([
      RepairRequest.countDocuments({ 'item.category': id, requestStatus: { $nin: ['completed', 'cancelled'] } }),
      RepairJob.countDocuments({ currentStatus: { $nin: ['completed', 'cancelled'] } }),
      TechnicianProfile.countDocuments({ supportedCategories: id }),
      Item.countDocuments({ category: id }),
    ]);
    impact = { affectedRequests: reqCount, affectedJobs: jobCount, affectedTechnicians: techCount, affectedItems: itemCount };
  } else if (type === 'skill') {
    const techCount = await TechnicianProfile.countDocuments({ skills: id });
    impact = { affectedTechnicians: techCount, affectedRequests: 0, affectedJobs: 0, affectedItems: 0 };
  }

  return successResponse(res, { impact });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  getSkills,
  createSkill,
  updateSkill,
  mergeSkills,
  getTaxonomyImpact,
};

