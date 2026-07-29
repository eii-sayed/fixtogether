const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/database');
const { User, ItemCategory, Skill, SafetyRule, TechnicianProfile, OrganizationProfile,
  Item, RepairRequest, AIAnalysis, Quotation, Appointment, RepairJob, Review,
  DonationOffer, DonationNeed, Notification } = require('../models');
const { ROLES, ORGANIZATION_TYPES, VERIFICATION_STATUS, ITEM_CONDITION,
  REPAIR_REQUEST_STATUS, QUOTATION_STATUS, APPOINTMENT_STATUS } = require('../constants');

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...\n');

    // Clear all collections
    const collections = [User, ItemCategory, Skill, SafetyRule, TechnicianProfile,
      OrganizationProfile, Item, RepairRequest, AIAnalysis, Quotation, Appointment,
      RepairJob, Review, DonationOffer, DonationNeed, Notification];
    for (const Model of collections) {
      await Model.deleteMany({});
    }
    console.log('✅ Cleared existing data');

    // ===== USERS =====
    const admin = await User.create({
      fullName: 'Admin User', email: 'admin@fixtogether.com',
      passwordHash: 'Admin123!', role: ROLES.ADMIN, emailVerified: true,
    });

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
    console.log('✅ Users created');

    // ===== CATEGORIES =====
    const electronics = await ItemCategory.create({ name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets', icon: 'monitor', riskLevel: 'medium', sortOrder: 1 });
    const bicycles = await ItemCategory.create({ name: 'Bicycles', slug: 'bicycles', description: 'All types of bicycles', icon: 'bike', riskLevel: 'low', sortOrder: 2 });
    const furniture = await ItemCategory.create({ name: 'Furniture', slug: 'furniture', description: 'Home and office furniture', icon: 'armchair', riskLevel: 'low', sortOrder: 3 });
    const appliances = await ItemCategory.create({ name: 'Low-risk Appliances', slug: 'low-risk-appliances', description: 'Small household appliances', icon: 'plug', riskLevel: 'medium', sortOrder: 4 });

    // Sub-categories
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
    console.log('✅ Categories created');

    // ===== SKILLS =====
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
    console.log('✅ Skills created');

    // ===== SAFETY RULES =====
    await SafetyRule.create([
      { keywords: ['spark', 'sparking', 'electric shock'], riskType: 'electrical', severity: 'high', warningMessage: 'This issue may involve electrical safety risks. Do not open or continue operating the item. Contact a qualified technician for inspection.', blockAIAdvice: true },
      { keywords: ['smoke', 'burning smell', 'fire', 'flame'], riskType: 'fire', severity: 'critical', warningMessage: 'This issue may involve fire safety risks. Stop using the item immediately and ensure it is unplugged. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['swollen battery', 'bloated battery', 'leaking battery', 'puffed battery'], riskType: 'battery', severity: 'critical', warningMessage: 'Damaged batteries can be hazardous. Do not puncture or heat. Contact a qualified technician for safe handling.', blockAIAdvice: true },
      { keywords: ['gas leak', 'hazardous chemical'], riskType: 'chemical', severity: 'critical', warningMessage: 'This may involve chemical safety risks. Ensure ventilation. Do not attempt repairs. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['microwave component', 'magnetron'], riskType: 'radiation', severity: 'critical', warningMessage: 'Microwave components can be dangerous. Do not disassemble. Contact a qualified technician.', blockAIAdvice: true },
      { keywords: ['medical equipment', 'medical device'], riskType: 'medical', severity: 'critical', warningMessage: 'Medical equipment must be serviced by certified professionals. Contact the manufacturer.', blockAIAdvice: true },
    ]);
    console.log('✅ Safety rules created');

    // ===== TECHNICIAN PROFILES =====
    const techProfiles = [];
    const techData = [
      { user: techs[0]._id, biography: 'Expert in electronics repair with 8 years of experience.', skills: [skills[0]._id, skills[1]._id, skills[2]._id, skills[3]._id], supportedCategories: [electronics._id], yearsOfExperience: 8, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.5, reviewCount: 23, completedRepairCount: 45, completionRate: 92, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 5000 } },
      { user: techs[1]._id, biography: 'Mobile phone and tablet specialist.', skills: [skills[0]._id, skills[2]._id, skills[3]._id, skills[5]._id], supportedCategories: [electronics._id], yearsOfExperience: 5, serviceMethods: ['dropoff', 'pickup'], averageRating: 4.2, reviewCount: 15, completedRepairCount: 30, completionRate: 88, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 300, maximum: 3000 } },
      { user: techs[2]._id, biography: 'Professional bicycle mechanic.', skills: [skills[6]._id, skills[7]._id, skills[8]._id], supportedCategories: [bicycles._id], yearsOfExperience: 12, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.8, reviewCount: 34, completedRepairCount: 89, completionRate: 95, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 200, maximum: 2000 } },
      { user: techs[3]._id, biography: 'Furniture restoration and repair.', skills: [skills[9]._id, skills[10]._id, skills[11]._id], supportedCategories: [furniture._id], yearsOfExperience: 6, serviceMethods: ['onsite', 'pickup'], averageRating: 4.0, reviewCount: 8, completedRepairCount: 15, completionRate: 85, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 8000 } },
      { user: techs[4]._id, biography: 'Small appliance repair specialist.', skills: [skills[12]._id, skills[13]._id], supportedCategories: [appliances._id], yearsOfExperience: 4, serviceMethods: ['dropoff'], averageRating: 4.3, reviewCount: 11, completedRepairCount: 22, completionRate: 90, verificationStatus: VERIFICATION_STATUS.PENDING, priceRange: { minimum: 300, maximum: 2500 } },
    ];

    for (const td of techData) {
      const tp = await TechnicianProfile.create(td);
      techProfiles.push(tp);
    }
    console.log('✅ Technician profiles created');

    // ===== ORGANIZATION PROFILES =====
    await OrganizationProfile.create([
      { user: orgs[0]._id, organizationName: 'Green Repair Group', organizationType: ORGANIZATION_TYPES.REPAIR_GROUP, description: 'Community repair events for electronics and appliances.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, appliances._id], pickupAvailable: false, activeStatus: true },
      { user: orgs[1]._id, organizationName: 'Hope Donations', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Accepting working and repairable electronics for underprivileged communities.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, furniture._id], neededItemCategories: [electronics._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[2]._id, organizationName: 'Community Aid Foundation', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Furniture and appliance donations for families in need.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [furniture._id, appliances._id], neededItemCategories: [furniture._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[3]._id, organizationName: 'EcoRecycle Facility', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Responsible recycling of electronics and appliances.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id, appliances._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[4]._id, organizationName: 'CleanTech Recyclers', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'E-waste recycling and component recovery.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [electronics._id], pickupAvailable: false, activeStatus: true },
    ]);
    console.log('✅ Organization profiles created');

    // ===== ITEMS =====
    const items = await Item.create([
      { owner: owners[0]._id, title: 'Samsung Galaxy S21 - Cracked Screen', category: electronics._id, subcategory: subCats[0]._id, brand: 'Samsung', model: 'Galaxy S21', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[0]._id, title: 'HP Laptop - Not Turning On', category: electronics._id, subcategory: subCats[1]._id, brand: 'HP', model: 'Pavilion 15', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 3, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[1]._id, title: 'Mountain Bike - Broken Chain', category: bicycles._id, subcategory: subCats[7]._id, brand: 'Giant', model: 'Talon 3', condition: ITEM_CONDITION.POOR, approximateAge: { value: 1, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[1]._id, title: 'Office Chair - Hydraulic Failure', category: furniture._id, subcategory: subCats[9]._id, brand: 'Ikea', model: 'Markus', condition: ITEM_CONDITION.POOR, approximateAge: { value: 4, unit: 'years' }, ownershipDeclaration: true },
      { owner: owners[2]._id, title: 'Electric Fan - Making Noise', category: appliances._id, subcategory: subCats[12]._id, brand: 'Panasonic', model: 'F-400', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 5, unit: 'years' }, ownershipDeclaration: true },
    ]);
    console.log('✅ Items created');

    // ===== REPAIR REQUESTS =====
    const rr1 = await RepairRequest.create({
      item: items[0]._id, owner: owners[0]._id,
      problemDescription: 'The phone screen is cracked after being dropped. The touchscreen still works partially in most areas but has dead spots near the bottom. The display has visible cracks radiating from the top-right corner.',
      eventBeforeIssue: 'Dropped on concrete floor', requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED, publishedAt: new Date(),
    });

    const rr2 = await RepairRequest.create({
      item: items[1]._id, owner: owners[0]._id,
      problemDescription: 'The laptop does not turn on at all. When I press the power button, there is no response - no LED lights, no fan noise, no screen activity. The charger light does not come on either.',
      eventBeforeIssue: 'Was working fine yesterday, left it charging overnight', requestStatus: REPAIR_REQUEST_STATUS.DRAFT,
    });

    const rr3 = await RepairRequest.create({
      item: items[2]._id, owner: owners[1]._id,
      problemDescription: 'The bicycle chain snapped while riding uphill. The rear derailleur also seems bent. Gears were making clicking sounds for a few days before the chain broke.',
      previousRepairAttempts: 'Tried to adjust the gears myself but could not fix the clicking', requestStatus: REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED,
      budgetMinimum: 500, budgetMaximum: 2000,
    });

    const rr4 = await RepairRequest.create({
      item: items[3]._id, owner: owners[1]._id,
      problemDescription: 'The office chair hydraulic cylinder has failed. The chair sinks down to its lowest position and will not stay up. The chair is otherwise in good condition.',
      requestStatus: REPAIR_REQUEST_STATUS.COMPLETED,
    });

    const rr5 = await RepairRequest.create({
      item: items[4]._id, owner: owners[2]._id,
      problemDescription: 'The electric fan makes a loud grinding noise when running on the highest speed. It also wobbles slightly. On lower speeds it works fine but the noise is getting worse.',
      requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
    });
    console.log('✅ Repair requests created');

    // ===== QUOTATIONS =====
    const q1 = await Quotation.create({
      repairRequest: rr3._id, technician: techs[2]._id,
      inspectionFee: 0, laborCostMinimum: 300, laborCostMaximum: 500,
      partsEstimate: 800, transportFee: 0, otherCosts: 0,
      expectedDuration: { value: 2, unit: 'days' }, warrantyDays: 30,
      conditions: 'Parts availability may affect timeline', status: QUOTATION_STATUS.ACCEPTED,
    });

    const q2 = await Quotation.create({
      repairRequest: rr5._id, technician: techs[4]._id,
      inspectionFee: 100, laborCostMinimum: 200, laborCostMaximum: 400,
      partsEstimate: 300, transportFee: 50, otherCosts: 0,
      expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 14,
      status: QUOTATION_STATUS.SUBMITTED,
    });

    // Update RR3 with selected quotation
    rr3.selectedQuotation = q1._id;
    await rr3.save();
    console.log('✅ Quotations created');

    // ===== REPAIR JOBS =====
    const job1 = await RepairJob.create({
      repairRequest: rr3._id, owner: owners[1]._id, technician: techs[2]._id,
      acceptedQuotation: q1._id, currentStatus: 'in_progress',
    });

    const job2 = await RepairJob.create({
      repairRequest: rr4._id, owner: owners[1]._id, technician: techs[3]._id,
      acceptedQuotation: q1._id, currentStatus: 'completed',
      completionReport: 'Replaced hydraulic cylinder. Chair tested and working.',
      finalLaborCost: 500, finalPartsCost: 800, finalTotalCost: 1300,
      ownerAcceptedCompletion: true, technicianConfirmedCompletion: true,
      completedAt: new Date(Date.now() - 7 * 86400000),
    });
    console.log('✅ Repair jobs created');

    // ===== REVIEWS =====
    await Review.create({
      repairJob: job2._id, reviewer: owners[1]._id, technician: techs[3]._id,
      rating: 4, communicationRating: 4, serviceQualityRating: 5, valueRating: 3,
      reviewText: 'Good repair work. The chair is like new. Price was a bit high but quality is excellent.',
    });
    console.log('✅ Reviews created');

    // ===== DONATION NEEDS =====
    await DonationNeed.create([
      { organization: (await OrganizationProfile.findOne({ user: orgs[1]._id }))._id, category: electronics._id, description: 'Need working or repairable laptops for students', minimumCondition: 'poor', quantityNeeded: 10, active: true },
      { organization: (await OrganizationProfile.findOne({ user: orgs[2]._id }))._id, category: furniture._id, description: 'Need chairs and tables for community center', minimumCondition: 'fair', quantityNeeded: 20, active: true },
    ]);
    console.log('✅ Donation needs created');

    // ===== NOTIFICATIONS =====
    await Notification.create([
      { user: owners[0]._id, type: 'repair_request_published', title: 'Request Published', message: 'Your repair request for Samsung Galaxy S21 has been published.', read: false },
      { user: techs[0]._id, type: 'quotation_invitation', title: 'New Quotation Invitation', message: 'You have been invited to quote on a repair request.', read: false },
      { user: techs[2]._id, type: 'quotation_accepted', title: 'Quotation Accepted', message: 'Your quotation for the bicycle repair has been accepted!', read: true },
      { user: owners[1]._id, type: 'repair_status_updated', title: 'Repair In Progress', message: 'The technician has started working on your bicycle.', read: false },
    ]);
    console.log('✅ Notifications created');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📋 Demo Credentials:');
    console.log('─────────────────────────────────────────');
    console.log('Admin:       admin@fixtogether.com / Admin123!');
    console.log('Owner 1:     rahim@example.com / Owner123!');
    console.log('Owner 2:     fatima@example.com / Owner123!');
    console.log('Owner 3:     karim@example.com / Owner123!');
    console.log('Tech 1:      sumon@example.com / Tech123!');
    console.log('Tech 2:      arafat@example.com / Tech123!');
    console.log('Tech 3:      bikash@example.com / Tech123!');
    console.log('Tech 4:      rony@example.com / Tech123!');
    console.log('Tech 5:      sadia@example.com / Tech123!');
    console.log('Repair Group: greenrepair@example.com / Org1234!');
    console.log('Donation 1:  hope@example.com / Org1234!');
    console.log('Donation 2:  communityaid@example.com / Org1234!');
    console.log('Recycler 1:  ecorecycle@example.com / Org1234!');
    console.log('Recycler 2:  cleantech@example.com / Org1234!');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
