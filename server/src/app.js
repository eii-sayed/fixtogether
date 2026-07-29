const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const itemRoutes = require('./routes/itemRoutes');
const repairRequestRoutes = require('./routes/repairRequestRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const repairJobRoutes = require('./routes/repairJobRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { donationRoutes, partsRoutes, warrantyRoutes, warrantyClaimsRoutes,
  reviewRoutes, disputeRoutes, notificationRoutes } = require('./routes/additionalRoutes');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const corsOrigin = config.clientUrl.replace(/\/+$/, '');
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  }));
}

// General rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: config.env });
});

// Temporary seed endpoint (remove after use)
app.post('/api/seed-data', async (req, res) => {
  const secret = req.headers['x-seed-secret'];
  if (secret !== 'ft-seed-2026-temp') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { User, ItemCategory, Skill, SafetyRule, TechnicianProfile, OrganizationProfile,
      Item, RepairRequest, AIAnalysis, Quotation, Appointment, RepairJob, Review,
      DonationOffer, DonationNeed, Notification } = require('./models');
    const { ROLES, ORGANIZATION_TYPES, VERIFICATION_STATUS, ITEM_CONDITION,
      REPAIR_REQUEST_STATUS, QUOTATION_STATUS } = require('./constants');

    // Clear existing data
    const collections = [User, ItemCategory, Skill, SafetyRule, TechnicianProfile,
      OrganizationProfile, Item, RepairRequest, AIAnalysis, Quotation, Appointment,
      RepairJob, Review, DonationOffer, DonationNeed, Notification];
    for (const Model of collections) {
      await Model.deleteMany({});
    }

    // Users
    const admin = await User.create({ fullName: 'Admin User', email: 'admin@fixtogether.com', passwordHash: 'Admin123!', role: ROLES.ADMIN, emailVerified: true });
    const owners = await User.create([
      { fullName: 'Rahim Ahmed', email: 'rahim@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01712345678' },
      { fullName: 'Fatima Begum', email: 'fatima@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01812345678' },
      { fullName: 'Karim Hassan', email: 'karim@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01912345678' },
    ]);
    const techs = await User.create([
      { fullName: 'Sumon Electronics', email: 'sumon@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true },
      { fullName: 'Arafat Mobile Care', email: 'arafat@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true },
      { fullName: 'Bikash Cycle Works', email: 'bikash@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true },
      { fullName: 'Rony Furniture Fix', email: 'rony@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true },
      { fullName: 'Sadia Appliance Pro', email: 'sadia@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true },
    ]);
    const orgs = await User.create([
      { fullName: 'Green Repair Group', email: 'greenrepair@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true },
      { fullName: 'Hope Donations', email: 'hope@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true },
      { fullName: 'Community Aid Foundation', email: 'communityaid@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true },
      { fullName: 'EcoRecycle Facility', email: 'ecorecycle@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true },
      { fullName: 'CleanTech Recyclers', email: 'cleantech@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true },
    ]);

    // Categories
    const electronics = await ItemCategory.create({ name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets', icon: 'monitor', riskLevel: 'medium', sortOrder: 1 });
    const bicycles = await ItemCategory.create({ name: 'Bicycles', slug: 'bicycles', description: 'All types of bicycles', icon: 'bike', riskLevel: 'low', sortOrder: 2 });
    const furniture = await ItemCategory.create({ name: 'Furniture', slug: 'furniture', description: 'Home and office furniture', icon: 'armchair', riskLevel: 'low', sortOrder: 3 });
    const appliances = await ItemCategory.create({ name: 'Low-risk Appliances', slug: 'low-risk-appliances', description: 'Small household appliances', icon: 'plug', riskLevel: 'medium', sortOrder: 4 });
    const subCats = await ItemCategory.create([
      { name: 'Mobile phone', slug: 'mobile-phone', parent: electronics._id, icon: 'smartphone', riskLevel: 'medium', sortOrder: 1 },
      { name: 'Laptop', slug: 'laptop', parent: electronics._id, icon: 'laptop', riskLevel: 'medium', sortOrder: 2 },
      { name: 'Desktop computer', slug: 'desktop-computer', parent: electronics._id, icon: 'monitor', riskLevel: 'medium', sortOrder: 3 },
      { name: 'Monitor', slug: 'monitor', parent: electronics._id, icon: 'monitor', riskLevel: 'medium', sortOrder: 4 },
      { name: 'Speaker', slug: 'speaker', parent: electronics._id, icon: 'speaker', riskLevel: 'low', sortOrder: 5 },
      { name: 'Computer accessory', slug: 'computer-accessory', parent: electronics._id, icon: 'mouse', riskLevel: 'low', sortOrder: 6 },
      { name: 'Road bicycle', slug: 'road-bicycle', parent: bicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 1 },
      { name: 'Mountain bicycle', slug: 'mountain-bicycle', parent: bicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 2 },
      { name: 'City bicycle', slug: 'city-bicycle', parent: bicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 3 },
      { name: 'Chair', slug: 'chair', parent: furniture._id, icon: 'armchair', riskLevel: 'low', sortOrder: 1 },
      { name: 'Table', slug: 'table', parent: furniture._id, icon: 'table', riskLevel: 'low', sortOrder: 2 },
      { name: 'Cabinet', slug: 'cabinet', parent: furniture._id, icon: 'archive', riskLevel: 'low', sortOrder: 3 },
      { name: 'Electric fan', slug: 'electric-fan', parent: appliances._id, icon: 'fan', riskLevel: 'medium', sortOrder: 1 },
      { name: 'Blender', slug: 'blender', parent: appliances._id, icon: 'blend', riskLevel: 'medium', sortOrder: 2 },
      { name: 'Rice cooker', slug: 'rice-cooker', parent: appliances._id, icon: 'cooking-pot', riskLevel: 'medium', sortOrder: 3 },
      { name: 'Electric kettle', slug: 'electric-kettle', parent: appliances._id, icon: 'coffee', riskLevel: 'medium', sortOrder: 4 },
      { name: 'Iron', slug: 'iron', parent: appliances._id, icon: 'iron', riskLevel: 'medium', sortOrder: 5 },
    ]);

    // Skills
    const skills = await Skill.create([
      { name: 'Electronics Repair', slug: 'electronics-repair', category: electronics._id },
      { name: 'Soldering', slug: 'soldering', category: electronics._id },
      { name: 'Screen Replacement', slug: 'screen-replacement', category: electronics._id },
      { name: 'Battery Replacement', slug: 'battery-replacement', category: electronics._id },
      { name: 'Motherboard Repair', slug: 'motherboard-repair', category: electronics._id },
      { name: 'Software Troubleshooting', slug: 'software-troubleshooting', category: electronics._id },
      { name: 'Bicycle Mechanics', slug: 'bicycle-mechanics', category: bicycles._id },
      { name: 'Wheel Truing', slug: 'wheel-truing', category: bicycles._id },
      { name: 'Brake Adjustment', slug: 'brake-adjustment', category: bicycles._id },
      { name: 'Furniture Repair', slug: 'furniture-repair', category: furniture._id },
      { name: 'Woodworking', slug: 'woodworking', category: furniture._id },
      { name: 'Upholstery', slug: 'upholstery', category: furniture._id },
      { name: 'Appliance Repair', slug: 'appliance-repair', category: appliances._id },
      { name: 'Motor Repair', slug: 'motor-repair', category: appliances._id },
    ]);

    // Safety Rules
    await SafetyRule.create([
      { keywords: ['spark', 'sparking', 'electric shock'], riskType: 'electrical', severity: 'high', warningMessage: 'This issue may involve electrical safety risks. Do not open or continue operating the item. Contact a qualified technician for inspection.', blockAIAdvice: true },
      { keywords: ['smoke', 'burning smell', 'fire', 'flame'], riskType: 'fire', severity: 'critical', warningMessage: 'This issue may involve fire safety risks. Stop using the item immediately and ensure it is unplugged. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['swollen battery', 'bloated battery', 'leaking battery', 'puffed battery'], riskType: 'battery', severity: 'critical', warningMessage: 'Damaged batteries can be hazardous. Do not puncture or heat. Contact a qualified technician for safe handling.', blockAIAdvice: true },
      { keywords: ['gas leak', 'hazardous chemical'], riskType: 'chemical', severity: 'critical', warningMessage: 'This may involve chemical safety risks. Ensure ventilation. Do not attempt repairs. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['microwave component', 'magnetron'], riskType: 'radiation', severity: 'critical', warningMessage: 'Microwave components can be dangerous. Do not disassemble. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['medical equipment', 'medical device'], riskType: 'medical', severity: 'critical', warningMessage: 'Medical equipment must be serviced by certified professionals. Contact the manufacturer.', blockAIAdvice: true },
    ]);

    // Technician Profiles
    const techData = [
      { user: techs[0]._id, biography: 'Expert in electronics repair with 8 years of experience.', skills: [skills[0]._id, skills[1]._id, skills[2]._id, skills[3]._id], supportedCategories: [electronics._id], yearsOfExperience: 8, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.5, reviewCount: 23, completedRepairCount: 45, completionRate: 92, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 5000 } },
      { user: techs[1]._id, biography: 'Mobile phone and tablet specialist.', skills: [skills[0]._id, skills[2]._id, skills[3]._id, skills[5]._id], supportedCategories: [electronics._id], yearsOfExperience: 5, serviceMethods: ['dropoff', 'pickup'], averageRating: 4.2, reviewCount: 15, completedRepairCount: 30, completionRate: 88, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 300, maximum: 3000 } },
      { user: techs[2]._id, biography: 'Professional bicycle mechanic.', skills: [skills[6]._id, skills[7]._id, skills[8]._id], supportedCategories: [bicycles._id], yearsOfExperience: 12, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.8, reviewCount: 34, completedRepairCount: 89, completionRate: 95, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 200, maximum: 2000 } },
      { user: techs[3]._id, biography: 'Furniture restoration and repair.', skills: [skills[9]._id, skills[10]._id, skills[11]._id], supportedCategories: [furniture._id], yearsOfExperience: 6, serviceMethods: ['onsite', 'pickup'], averageRating: 4.0, reviewCount: 8, completedRepairCount: 15, completionRate: 85, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 8000 } },
      { user: techs[4]._id, biography: 'Small appliance repair specialist.', skills: [skills[12]._id, skills[13]._id], supportedCategories: [appliances._id], yearsOfExperience: 4, serviceMethods: ['dropoff'], averageRating: 4.3, reviewCount: 11, completedRepairCount: 22, completionRate: 90, verificationStatus: VERIFICATION_STATUS.PENDING, priceRange: { minimum: 300, maximum: 2500 } },
    ];
    for (const td of techData) { await TechnicianProfile.create(td); }

    // Organization Profiles
    await OrganizationProfile.create([
      { user: orgs[0]._id, organizationName: 'Green Repair Group', organizationType: ORGANIZATION_TYPES.REPAIR_GROUP, description: 'Community repair events for electronics and appliances.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, appliances._id], pickupAvailable: false, activeStatus: true },
      { user: orgs[1]._id, organizationName: 'Hope Donations', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Accepting working and repairable electronics for underprivileged communities.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, furniture._id], neededItemCategories: [electronics._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[2]._id, organizationName: 'Community Aid Foundation', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Furniture and appliance donations for families in need.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [furniture._id, appliances._id], neededItemCategories: [furniture._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[3]._id, organizationName: 'EcoRecycle Facility', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Responsible recycling of electronics and appliances.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, appliances._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[4]._id, organizationName: 'CleanTech Recyclers', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'E-waste recycling and component recovery.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id], pickupAvailable: false, activeStatus: true },
    ]);

    // Items
    const items = await Item.create([
      { owner: owners[0]._id, title: 'Samsung Galaxy S21 - Cracked Screen', category: electronics._id, subcategory: subCats[0]._id, brand: 'Samsung', model: 'Galaxy S21', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[0]._id, title: 'HP Laptop - Not Turning On', category: electronics._id, subcategory: subCats[1]._id, brand: 'HP', model: 'Pavilion 15', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 3, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[1]._id, title: 'Mountain Bike - Broken Chain', category: bicycles._id, subcategory: subCats[7]._id, brand: 'Giant', model: 'Talon 3', condition: ITEM_CONDITION.POOR, approximateAge: { value: 1, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[1]._id, title: 'Office Chair - Hydraulic Failure', category: furniture._id, subcategory: subCats[9]._id, brand: 'Ikea', model: 'Markus', condition: ITEM_CONDITION.POOR, approximateAge: { value: 4, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[2]._id, title: 'Electric Fan - Making Noise', category: appliances._id, subcategory: subCats[12]._id, brand: 'Panasonic', model: 'F-400', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 5, unit: 'years' }, ownershipDeclaration: true },
    ]);

    // Repair Requests
    const rr1 = await RepairRequest.create({ item: items[0]._id, owner: owners[0]._id, problemDescription: 'The phone screen is cracked after being dropped. The touchscreen still works partially in most areas but has dead spots near the bottom.', eventBeforeIssue: 'Dropped on concrete floor', requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED, publishedAt: new Date() });
    const rr2 = await RepairRequest.create({ item: items[1]._id, owner: owners[0]._id, problemDescription: 'The laptop does not turn on at all. When I press the power button, there is no response - no LED lights, no fan noise, no screen activity.', eventBeforeIssue: 'Was working fine yesterday, left it charging overnight', requestStatus: REPAIR_REQUEST_STATUS.DRAFT });
    const rr3 = await RepairRequest.create({ item: items[2]._id, owner: owners[1]._id, problemDescription: 'The bicycle chain snapped while riding uphill. The rear derailleur also seems bent.', previousRepairAttempts: 'Tried to adjust the gears myself', requestStatus: REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, budgetMinimum: 500, budgetMaximum: 2000 });
    const rr4 = await RepairRequest.create({ item: items[3]._id, owner: owners[1]._id, problemDescription: 'The office chair hydraulic cylinder has failed. The chair sinks down to its lowest position.', requestStatus: REPAIR_REQUEST_STATUS.COMPLETED });
    const rr5 = await RepairRequest.create({ item: items[4]._id, owner: owners[2]._id, problemDescription: 'The electric fan makes a loud grinding noise when running on the highest speed. It also wobbles slightly.', requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS });

    // Quotations
    const q1 = await Quotation.create({ repairRequest: rr3._id, technician: techs[2]._id, inspectionFee: 0, laborCostMinimum: 300, laborCostMaximum: 500, partsEstimate: 800, transportFee: 0, otherCosts: 0, expectedDuration: { value: 2, unit: 'days' }, warrantyDays: 30, conditions: 'Parts availability may affect timeline', status: QUOTATION_STATUS.ACCEPTED });
    const q2 = await Quotation.create({ repairRequest: rr5._id, technician: techs[4]._id, inspectionFee: 100, laborCostMinimum: 200, laborCostMaximum: 400, partsEstimate: 300, transportFee: 50, otherCosts: 0, expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 14, status: QUOTATION_STATUS.SUBMITTED });
    rr3.selectedQuotation = q1._id; await rr3.save();

    // Repair Jobs
    await RepairJob.create({ repairRequest: rr3._id, owner: owners[1]._id, technician: techs[2]._id, acceptedQuotation: q1._id, currentStatus: 'in_progress' });
    const job2 = await RepairJob.create({ repairRequest: rr4._id, owner: owners[1]._id, technician: techs[3]._id, acceptedQuotation: q1._id, currentStatus: 'completed', completionReport: 'Replaced hydraulic cylinder. Chair tested and working.', finalLaborCost: 500, finalPartsCost: 800, finalTotalCost: 1300, ownerAcceptedCompletion: true, technicianConfirmedCompletion: true, completedAt: new Date(Date.now() - 7 * 86400000) });

    // Reviews
    await Review.create({ repairJob: job2._id, reviewer: owners[1]._id, technician: techs[3]._id, rating: 4, communicationRating: 4, serviceQualityRating: 5, valueRating: 3, reviewText: 'Good repair work. The chair is like new.' });

    // Donation Needs
    await DonationNeed.create([
      { organization: (await OrganizationProfile.findOne({ user: orgs[1]._id }))._id, category: electronics._id, description: 'Need working or repairable laptops for students', minimumCondition: 'poor', quantityNeeded: 10, active: true },
      { organization: (await OrganizationProfile.findOne({ user: orgs[2]._id }))._id, category: furniture._id, description: 'Need chairs and tables for community center', minimumCondition: 'fair', quantityNeeded: 20, active: true },
    ]);

    // Notifications
    await Notification.create([
      { user: owners[0]._id, type: 'repair_request_published', title: 'Request Published', message: 'Your repair request for Samsung Galaxy S21 has been published.', read: false },
      { user: techs[0]._id, type: 'quotation_invitation', title: 'New Quotation Invitation', message: 'You have been invited to quote on a repair request.', read: false },
      { user: techs[2]._id, type: 'quotation_accepted', title: 'Quotation Accepted', message: 'Your quotation for the bicycle repair has been accepted!', read: true },
      { user: owners[1]._id, type: 'repair_status_updated', title: 'Repair In Progress', message: 'The technician has started working on your bicycle.', read: false },
    ]);

    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API v1 routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/technicians`, technicianRoutes);
app.use(`${API_PREFIX}/organizations`, organizationRoutes);
app.use(`${API_PREFIX}`, categoryRoutes); // /categories and /skills
app.use(`${API_PREFIX}/items`, itemRoutes);
app.use(`${API_PREFIX}/repair-requests`, repairRequestRoutes);
app.use(`${API_PREFIX}/quotations`, quotationRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/repair-jobs`, repairJobRoutes);
app.use(`${API_PREFIX}/donations`, donationRoutes);
app.use(`${API_PREFIX}/parts`, partsRoutes);
app.use(`${API_PREFIX}/warranties`, warrantyRoutes);
app.use(`${API_PREFIX}/warranty-claims`, warrantyClaimsRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/disputes`, disputeRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
