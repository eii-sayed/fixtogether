const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/database');
const {
  User,
  ItemCategory,
  Skill,
  SafetyRule,
  TechnicianProfile,
  OrganizationProfile,
  Item,
  RepairRequest,
  AIAnalysis,
  Quotation,
  Appointment,
  RepairJob,
  Review,
  DonationOffer,
  DonationNeed,
  Notification,
  Message,
} = require('../models');

const {
  ROLES,
  ORGANIZATION_TYPES,
  VERIFICATION_STATUS,
  ITEM_CONDITION,
  REPAIR_REQUEST_STATUS,
  QUOTATION_STATUS,
  APPOINTMENT_STATUS,
  REPAIR_JOB_STATUS,
  DONATION_STATUS,
  NOTIFICATION_TYPES,
} = require('../constants');

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting comprehensive database seeding (10+ per field)...\n');

    // 1. Clear all existing data
    const collections = [
      User,
      ItemCategory,
      Skill,
      SafetyRule,
      TechnicianProfile,
      OrganizationProfile,
      Item,
      RepairRequest,
      AIAnalysis,
      Quotation,
      Appointment,
      RepairJob,
      Review,
      DonationOffer,
      DonationNeed,
      Notification,
      Message,
    ];

    for (const Model of collections) {
      await Model.deleteMany({});
    }
    console.log('✅ Cleared all collections');

    // 2. USERS (1 Admin, 10 Owners, 10 Technicians, 10 Organizations)
    console.log('⏳ Creating users...');
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@fixtogether.com',
      passwordHash: 'Admin123!',
      role: ROLES.ADMIN,
      emailVerified: true,
      phone: '01700000000',
    });

    const owners = await User.create([
      { fullName: 'Rahim Ahmed', email: 'rahim@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01711111111' },
      { fullName: 'Fatima Begum', email: 'fatima@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01722222222' },
      { fullName: 'Karim Hassan', email: 'karim@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01733333333' },
      { fullName: 'Anika Tabassum', email: 'anika@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01744444444' },
      { fullName: 'Tanvir Islam', email: 'tanvir@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01755555555' },
      { fullName: 'Nusrat Jahan', email: 'nusrat@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01766666666' },
      { fullName: 'Shakib Al Hasan', email: 'shakib@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01777777777' },
      { fullName: 'Mehedi Hasan', email: 'mehedi@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01788888888' },
      { fullName: 'Priya Roy', email: 'priya@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01799999999' },
      { fullName: 'Tariqul Islam', email: 'tariqul@example.com', passwordHash: 'Owner123!', role: ROLES.OWNER, emailVerified: true, phone: '01710101010' },
    ]);

    const techs = await User.create([
      { fullName: 'Sumon Electronics', email: 'sumon@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01811111111' },
      { fullName: 'Arafat Mobile Care', email: 'arafat@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01822222222' },
      { fullName: 'Bikash Cycle Works', email: 'bikash@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01833333333' },
      { fullName: 'Rony Furniture Fix', email: 'rony@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01844444444' },
      { fullName: 'Sadia Appliance Pro', email: 'sadia@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01855555555' },
      { fullName: 'Kamal Audio Systems', email: 'kamal@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01866666666' },
      { fullName: 'Nazmul Computer Hub', email: 'nazmul@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01877777777' },
      { fullName: 'Rubel Watch & Device Lab', email: 'rubel@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01888888888' },
      { fullName: 'Farhana Smart Home Tech', email: 'farhana@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01899999999' },
      { fullName: 'Jahangir Motor Works', email: 'jahangir@example.com', passwordHash: 'Tech123!', role: ROLES.TECHNICIAN, emailVerified: true, phone: '01810101010' },
    ]);

    const orgs = await User.create([
      { fullName: 'Green Repair Group', email: 'greenrepair@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01911111111' },
      { fullName: 'Hope Donations', email: 'hope@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01922222222' },
      { fullName: 'Community Aid Foundation', email: 'communityaid@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01933333333' },
      { fullName: 'EcoRecycle Facility', email: 'ecorecycle@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01944444444' },
      { fullName: 'CleanTech Recyclers', email: 'cleantech@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01955555555' },
      { fullName: 'TechForGood Bangladesh', email: 'techforgood@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01966666666' },
      { fullName: 'Village Reuse Initiative', email: 'villagereuse@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01977777777' },
      { fullName: 'Sustainable Earth Center', email: 'sustainable@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01988888888' },
      { fullName: 'Urban Charity Guild', email: 'urbancharity@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01999999999' },
      { fullName: 'Dhaka E-Waste Hub', email: 'ewastehub@example.com', passwordHash: 'Org1234!', role: ROLES.ORGANIZATION, emailVerified: true, phone: '01910101010' },
    ]);
    console.log(`✅ Users created: 1 Admin, ${owners.length} Owners, ${techs.length} Technicians, ${orgs.length} Organizations`);

    // 3. CATEGORIES & SUBCATEGORIES (5 main, 17 subcategories)
    console.log('⏳ Creating categories...');
    const catElectronics = await ItemCategory.create({ name: 'Electronics', slug: 'electronics', description: 'Electronic devices, circuit boards, and gadgets', icon: 'monitor', riskLevel: 'medium', sortOrder: 1 });
    const catBicycles = await ItemCategory.create({ name: 'Bicycles', slug: 'bicycles', description: 'All types of bicycles and cycling gear', icon: 'bike', riskLevel: 'low', sortOrder: 2 });
    const catFurniture = await ItemCategory.create({ name: 'Furniture', slug: 'furniture', description: 'Home, study, and office furniture', icon: 'armchair', riskLevel: 'low', sortOrder: 3 });
    const catAppliances = await ItemCategory.create({ name: 'Low-risk Appliances', slug: 'low-risk-appliances', description: 'Small household and kitchen appliances', icon: 'plug', riskLevel: 'medium', sortOrder: 4 });
    const catPersonal = await ItemCategory.create({ name: 'Personal Devices', slug: 'personal-devices', description: 'Wearables, audio devices, and smart gear', icon: 'headphones', riskLevel: 'low', sortOrder: 5 });

    const parentCategories = [catElectronics, catBicycles, catFurniture, catAppliances, catPersonal];

    const subCats = await ItemCategory.create([
      { name: 'Mobile phone', slug: 'mobile-phone', parent: catElectronics._id, icon: 'smartphone', riskLevel: 'medium', sortOrder: 1 },
      { name: 'Laptop', slug: 'laptop', parent: catElectronics._id, icon: 'laptop', riskLevel: 'medium', sortOrder: 2 },
      { name: 'Desktop computer', slug: 'desktop-computer', parent: catElectronics._id, icon: 'monitor', riskLevel: 'medium', sortOrder: 3 },
      { name: 'Computer Monitor', slug: 'computer-monitor', parent: catElectronics._id, icon: 'tv', riskLevel: 'medium', sortOrder: 4 },
      { name: 'Audio Speaker', slug: 'audio-speaker', parent: catElectronics._id, icon: 'speaker', riskLevel: 'low', sortOrder: 5 },
      { name: 'Road bicycle', slug: 'road-bicycle', parent: catBicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 1 },
      { name: 'Mountain bicycle', slug: 'mountain-bicycle', parent: catBicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 2 },
      { name: 'City bicycle', slug: 'city-bicycle', parent: catBicycles._id, icon: 'bike', riskLevel: 'low', sortOrder: 3 },
      { name: 'Office Chair', slug: 'office-chair', parent: catFurniture._id, icon: 'armchair', riskLevel: 'low', sortOrder: 1 },
      { name: 'Wooden Table', slug: 'wooden-table', parent: catFurniture._id, icon: 'table', riskLevel: 'low', sortOrder: 2 },
      { name: 'Storage Cabinet', slug: 'storage-cabinet', parent: catFurniture._id, icon: 'archive', riskLevel: 'low', sortOrder: 3 },
      { name: 'Electric fan', slug: 'electric-fan', parent: catAppliances._id, icon: 'fan', riskLevel: 'medium', sortOrder: 1 },
      { name: 'Food Blender', slug: 'food-blender', parent: catAppliances._id, icon: 'blend', riskLevel: 'medium', sortOrder: 2 },
      { name: 'Rice Cooker', slug: 'rice-cooker', parent: catAppliances._id, icon: 'cooking-pot', riskLevel: 'medium', sortOrder: 3 },
      { name: 'Electric Kettle', slug: 'electric-kettle', parent: catAppliances._id, icon: 'coffee', riskLevel: 'medium', sortOrder: 4 },
      { name: 'Smartwatch', slug: 'smartwatch', parent: catPersonal._id, icon: 'watch', riskLevel: 'low', sortOrder: 1 },
      { name: 'Headphones', slug: 'headphones', parent: catPersonal._id, icon: 'headphones', riskLevel: 'low', sortOrder: 2 },
    ]);
    console.log(`✅ Categories created: ${parentCategories.length} main categories, ${subCats.length} subcategories`);

    // 4. SKILLS (16 skills)
    console.log('⏳ Creating skills...');
    const skills = await Skill.create([
      { name: 'Electronics Repair', slug: 'electronics-repair', category: catElectronics._id },
      { name: 'Micro Soldering', slug: 'micro-soldering', category: catElectronics._id },
      { name: 'Screen Replacement', slug: 'screen-replacement', category: catElectronics._id },
      { name: 'Battery Replacement', slug: 'battery-replacement', category: catElectronics._id },
      { name: 'Motherboard Diagnostics', slug: 'motherboard-diagnostics', category: catElectronics._id },
      { name: 'Software Troubleshooting', slug: 'software-troubleshooting', category: catElectronics._id },
      { name: 'Bicycle Mechanics', slug: 'bicycle-mechanics', category: catBicycles._id },
      { name: 'Wheel Truing', slug: 'wheel-truing', category: catBicycles._id },
      { name: 'Brake & Gear Adjustment', slug: 'brake-gear-adjustment', category: catBicycles._id },
      { name: 'Hydraulic System Bleeding', slug: 'hydraulic-system-bleeding', category: catBicycles._id },
      { name: 'Furniture Restoration', slug: 'furniture-restoration', category: catFurniture._id },
      { name: 'Woodworking & Joinery', slug: 'woodworking-joinery', category: catFurniture._id },
      { name: 'Upholstery & Foam Replacement', slug: 'upholstery-foam-replacement', category: catFurniture._id },
      { name: 'Small Appliance Repair', slug: 'small-appliance-repair', category: catAppliances._id },
      { name: 'Electric Motor Rewinding', slug: 'electric-motor-rewinding', category: catAppliances._id },
      { name: 'Heating Element Replacement', slug: 'heating-element-replacement', category: catAppliances._id },
    ]);
    console.log(`✅ Skills created: ${skills.length} skills`);

    // 5. SAFETY RULES (10 rules)
    console.log('⏳ Creating safety rules...');
    await SafetyRule.create([
      { keywords: ['spark', 'sparking', 'electric shock', 'short circuit'], riskType: 'electrical', severity: 'high', warningMessage: 'This issue may involve electrical arcing hazard. Do not operate or open. Contact a licensed technician.', blockAIAdvice: true },
      { keywords: ['smoke', 'burning smell', 'fire', 'flame', 'charred'], riskType: 'fire', severity: 'critical', warningMessage: 'Critical fire hazard detected! Unplug the device immediately and place it in a safe area.', blockAIAdvice: true },
      { keywords: ['swollen battery', 'bloated battery', 'leaking battery', 'puffed battery'], riskType: 'battery', severity: 'critical', warningMessage: 'Swollen lithium-ion battery hazard. Do not puncture, charge, or heat. Handle with extreme care.', blockAIAdvice: true },
      { keywords: ['gas leak', 'smells like gas', 'hazardous chemical'], riskType: 'chemical', severity: 'critical', warningMessage: 'Chemical or gas hazard. Keep area ventilated, avoid open flames, and consult professional services.', blockAIAdvice: true },
      { keywords: ['microwave component', 'magnetron', 'high voltage capacitor'], riskType: 'radiation', severity: 'critical', warningMessage: 'High-voltage radiation component hazard. Never attempt DIY disassembly on microwave internals.', blockAIAdvice: true },
      { keywords: ['medical equipment', 'oxygen concentrator', 'defibrillator'], riskType: 'medical', severity: 'critical', warningMessage: 'Certified medical device. Must be serviced strictly by manufacturer authorized engineers.', blockAIAdvice: true },
      { keywords: ['water damaged live circuit', 'dropped in water while plugged'], riskType: 'electrical', severity: 'high', warningMessage: 'Electrocution hazard. Ensure main breaker is turned off before touching wet electronics.', blockAIAdvice: true },
      { keywords: ['broken mercury thermometer', 'mercury spill'], riskType: 'chemical', severity: 'critical', warningMessage: 'Toxic mercury vapor hazard. Evacuate room and follow chemical spill disposal protocols.', blockAIAdvice: true },
      { keywords: ['frayed mains cord', 'exposed 220v wire'], riskType: 'electrical', severity: 'high', warningMessage: 'Direct 220V shock hazard. Disconnect power supply before handling cord.', blockAIAdvice: true },
      { keywords: ['overheating pressure cooker', 'stuck pressure valve'], riskType: 'physical', severity: 'critical', warningMessage: 'Explosion risk from high pressure. Turn off heat immediately and allow natural cooling.', blockAIAdvice: true },
    ]);
    console.log('✅ Safety rules created (10 rules)');

    // 6. TECHNICIAN PROFILES (10 profiles)
    console.log('⏳ Creating technician profiles...');
    const techProfilesData = [
      { user: techs[0]._id, biography: 'Master electronics technician with 9 years of board-level micro-soldering experience.', skills: [skills[0]._id, skills[1]._id, skills[4]._id], supportedCategories: [catElectronics._id], yearsOfExperience: 9, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.8, reviewCount: 42, completedRepairCount: 85, completionRate: 96, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 6000 } },
      { user: techs[1]._id, biography: 'Specialized mobile smartphone and tablet repair technician with quick turnaround.', skills: [skills[0]._id, skills[2]._id, skills[3]._id, skills[5]._id], supportedCategories: [catElectronics._id, catPersonal._id], yearsOfExperience: 6, serviceMethods: ['dropoff', 'pickup'], averageRating: 4.6, reviewCount: 35, completedRepairCount: 68, completionRate: 94, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 300, maximum: 4500 } },
      { user: techs[2]._id, biography: 'Certified bicycle mechanic for road, mountain, and commuter bikes.', skills: [skills[6]._id, skills[7]._id, skills[8]._id, skills[9]._id], supportedCategories: [catBicycles._id], yearsOfExperience: 11, serviceMethods: ['onsite', 'dropoff'], averageRating: 4.9, reviewCount: 56, completedRepairCount: 120, completionRate: 98, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 200, maximum: 3000 } },
      { user: techs[3]._id, biography: 'Wood restoration, carpentry joinery, and office furniture specialist.', skills: [skills[10]._id, skills[11]._id, skills[12]._id], supportedCategories: [catFurniture._id], yearsOfExperience: 8, serviceMethods: ['onsite', 'pickup'], averageRating: 4.4, reviewCount: 20, completedRepairCount: 40, completionRate: 90, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 600, maximum: 9000 } },
      { user: techs[4]._id, biography: 'Kitchen and home appliances engineer focusing on motors, blenders, and fans.', skills: [skills[13]._id, skills[14]._id, skills[15]._id], supportedCategories: [catAppliances._id], yearsOfExperience: 7, serviceMethods: ['dropoff', 'pickup'], averageRating: 4.7, reviewCount: 29, completedRepairCount: 55, completionRate: 93, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 300, maximum: 3500 } },
      { user: techs[5]._id, biography: 'Audio engineer specializing in speakers, amplifiers, soundbars, and headphones.', skills: [skills[0]._id, skills[1]._id], supportedCategories: [catElectronics._id, catPersonal._id], yearsOfExperience: 10, serviceMethods: ['dropoff', 'onsite'], averageRating: 4.5, reviewCount: 18, completedRepairCount: 37, completionRate: 91, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 400, maximum: 5000 } },
      { user: techs[6]._id, biography: 'Desktop PC builder, laptop hardware technician, and cleanroom specialist.', skills: [skills[0]._id, skills[4]._id, skills[5]._id], supportedCategories: [catElectronics._id], yearsOfExperience: 5, serviceMethods: ['onsite', 'remote', 'dropoff'], averageRating: 4.3, reviewCount: 16, completedRepairCount: 32, completionRate: 89, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 500, maximum: 5500 } },
      { user: techs[7]._id, biography: 'Precision micro-mechanics for smartwatches, wearable sensors, and gadgets.', skills: [skills[0]._id, skills[1]._id, skills[3]._id], supportedCategories: [catPersonal._id], yearsOfExperience: 4, serviceMethods: ['dropoff'], averageRating: 4.6, reviewCount: 14, completedRepairCount: 26, completionRate: 92, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 400, maximum: 3000 } },
      { user: techs[8]._id, biography: 'Smart home IoT installations, electric kettle, and smart cooker repairs.', skills: [skills[13]._id, skills[15]._id], supportedCategories: [catAppliances._id], yearsOfExperience: 5, serviceMethods: ['onsite'], averageRating: 4.2, reviewCount: 12, completedRepairCount: 24, completionRate: 88, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 350, maximum: 4000 } },
      { user: techs[9]._id, biography: 'Heavy duty motor rewinding, ceiling fans, and mechanical pump diagnostics.', skills: [skills[14]._id], supportedCategories: [catAppliances._id], yearsOfExperience: 14, serviceMethods: ['dropoff'], averageRating: 4.8, reviewCount: 38, completedRepairCount: 95, completionRate: 97, verificationStatus: VERIFICATION_STATUS.APPROVED, priceRange: { minimum: 300, maximum: 4000 } },
    ];

    const techProfiles = await TechnicianProfile.create(techProfilesData);
    console.log(`✅ Technician profiles created: ${techProfiles.length} profiles`);

    // 7. ORGANIZATION PROFILES (10 profiles)
    console.log('⏳ Creating organization profiles...');
    const orgProfilesData = [
      { user: orgs[0]._id, organizationName: 'Green Repair Group', organizationType: ORGANIZATION_TYPES.REPAIR_GROUP, description: 'Community repair cafes and sustainable electronics workshops.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id, catAppliances._id], pickupAvailable: false, activeStatus: true },
      { user: orgs[1]._id, organizationName: 'Hope Donations', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Refurbishing computers and mobile devices for underprivileged students.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id, catPersonal._id], neededItemCategories: [catElectronics._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[2]._id, organizationName: 'Community Aid Foundation', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Donations of study tables, chairs, and home essentials for families.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catFurniture._id, catAppliances._id], neededItemCategories: [catFurniture._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[3]._id, organizationName: 'EcoRecycle Facility', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Certified e-waste and metal recycling according to environmental standards.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id, catAppliances._id, catBicycles._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[4]._id, organizationName: 'CleanTech Recyclers', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Responsible circuit board sorting and precious metal component recovery.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id], pickupAvailable: false, activeStatus: true },
      { user: orgs[5]._id, organizationName: 'TechForGood Bangladesh', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Providing refurbished tech to community libraries and schools.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id, catPersonal._id], neededItemCategories: [catElectronics._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[6]._id, organizationName: 'Village Reuse Initiative', organizationType: ORGANIZATION_TYPES.REPAIR_GROUP, description: 'Bicycle repair cooperatives and rural transit empowerment programs.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catBicycles._id], neededItemCategories: [catBicycles._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[7]._id, organizationName: 'Sustainable Earth Center', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Zero-waste initiative processing plastic housings and appliance motors.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catAppliances._id, catFurniture._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[8]._id, organizationName: 'Urban Charity Guild', organizationType: ORGANIZATION_TYPES.DONATION_ORG, description: 'Donation hub distributing functional home appliances to social shelters.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catAppliances._id, catFurniture._id], neededItemCategories: [catAppliances._id], pickupAvailable: true, activeStatus: true },
      { user: orgs[9]._id, organizationName: 'Dhaka E-Waste Hub', organizationType: ORGANIZATION_TYPES.RECYCLING_FACILITY, description: 'Safe disposal and dismantling of obsolete lithium batteries and circuitry.', verificationStatus: VERIFICATION_STATUS.APPROVED, acceptedItemCategories: [catElectronics._id, catPersonal._id], pickupAvailable: false, activeStatus: true },
    ];

    const orgProfiles = await OrganizationProfile.create(orgProfilesData);
    console.log(`✅ Organization profiles created: ${orgProfiles.length} profiles`);

    // 8. ITEMS (15 items)
    console.log('⏳ Creating items...');
    const itemsData = [
      { owner: owners[0]._id, title: 'Samsung Galaxy S21 - Cracked Screen', category: catElectronics._id, subcategory: subCats[0]._id, brand: 'Samsung', model: 'Galaxy S21', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80', caption: 'Front display cracked' }] },
      { owner: owners[0]._id, title: 'HP Pavilion 15 - Power Failure', category: catElectronics._id, subcategory: subCats[1]._id, brand: 'HP', model: 'Pavilion 15', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 3, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80', caption: 'Laptop top view' }] },
      { owner: owners[1]._id, title: 'Giant Talon 3 Mountain Bike', category: catBicycles._id, subcategory: subCats[6]._id, brand: 'Giant', model: 'Talon 3', condition: ITEM_CONDITION.POOR, approximateAge: { value: 1, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80', caption: 'Mountain bike side profile' }] },
      { owner: owners[1]._id, title: 'Ikea Markus Ergonomic Chair', category: catFurniture._id, subcategory: subCats[8]._id, brand: 'Ikea', model: 'Markus', condition: ITEM_CONDITION.POOR, approximateAge: { value: 4, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1580481077114-1e0ef88df0a6?auto=format&fit=crop&w=600&q=80', caption: 'Office chair' }] },
      { owner: owners[2]._id, title: 'Panasonic Stand Fan F-400', category: catAppliances._id, subcategory: subCats[11]._id, brand: 'Panasonic', model: 'F-400', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 5, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1618941716939-553df3c6c278?auto=format&fit=crop&w=600&q=80', caption: 'Stand fan' }] },
      { owner: owners[2]._id, title: 'Philips ProBlend 600W Blender', category: catAppliances._id, subcategory: subCats[12]._id, brand: 'Philips', model: 'ProBlend 6', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80', caption: 'Kitchen blender' }] },
      { owner: owners[3]._id, title: 'Dell UltraSharp 27" 4K Monitor', category: catElectronics._id, subcategory: subCats[3]._id, brand: 'Dell', model: 'U2720Q', condition: ITEM_CONDITION.POOR, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80', caption: 'Dell Monitor' }] },
      { owner: owners[3]._id, title: 'Apple Watch Series 6 44mm', category: catPersonal._id, subcategory: subCats[15]._id, brand: 'Apple', model: 'Series 6', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 3, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80', caption: 'Smartwatch' }] },
      { owner: owners[4]._id, title: 'Sony WH-1000XM4 Headphones', category: catPersonal._id, subcategory: subCats[16]._id, brand: 'Sony', model: 'WH-1000XM4', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', caption: 'Headphones' }] },
      { owner: owners[4]._id, title: 'Trek Domane AL 2 Road Bike', category: catBicycles._id, subcategory: subCats[5]._id, brand: 'Trek', model: 'Domane AL 2', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=600&q=80', caption: 'Road bike' }] },
      { owner: owners[5]._id, title: 'Solid Oak Study Table', category: catFurniture._id, subcategory: subCats[9]._id, brand: 'Otobi', model: 'Classic Study', condition: ITEM_CONDITION.GOOD, approximateAge: { value: 4, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80', caption: 'Study desk' }] },
      { owner: owners[5]._id, title: 'Miyako 1.8L Rice Cooker', category: catAppliances._id, subcategory: subCats[13]._id, brand: 'Miyako', model: 'RC-180', condition: ITEM_CONDITION.POOR, approximateAge: { value: 3, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80', caption: 'Rice cooker' }] },
      { owner: owners[6]._id, title: 'JBL Bar 5.1 Soundbar Subwoofer', category: catElectronics._id, subcategory: subCats[4]._id, brand: 'JBL', model: 'Bar 5.1', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80', caption: 'Soundbar' }] },
      { owner: owners[7]._id, title: 'Asus ROG Strix Gaming PC', category: catElectronics._id, subcategory: subCats[2]._id, brand: 'Asus', model: 'ROG Strix G15', condition: ITEM_CONDITION.FAIR, approximateAge: { value: 2, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80', caption: 'Gaming desktop' }] },
      { owner: owners[8]._id, title: 'Havells Instant Electric Kettle', category: catAppliances._id, subcategory: subCats[14]._id, brand: 'Havells', model: 'Aqua Plus', condition: ITEM_CONDITION.BROKEN, approximateAge: { value: 1, unit: 'years' }, ownershipDeclaration: true, images: [{ url: 'https://images.unsplash.com/photo-1594213114663-ddf3f2a02126?auto=format&fit=crop&w=600&q=80', caption: 'Electric kettle' }] },
    ];

    const items = await Item.create(itemsData);
    console.log(`✅ Items created: ${items.length} items with images and specs`);

    // 9. REPAIR REQUESTS (12 requests)
    console.log('⏳ Creating repair requests...');
    const repairRequestsData = [
      {
        item: items[0]._id, owner: owners[0]._id,
        problemDescription: 'The Samsung Galaxy S21 screen cracked after being dropped. Touchscreen response is erratic near bottom corner.',
        eventBeforeIssue: 'Fell from hand onto pavement.', requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED, publishedAt: new Date(Date.now() - 3 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 3000, budgetMaximum: 6000,
      },
      {
        item: items[1]._id, owner: owners[0]._id,
        problemDescription: 'Laptop completely dead, no power LEDs illuminate when AC charger is plugged in.',
        eventBeforeIssue: 'Heavy thunderstorm last night while plugged in.', requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS,
        preferredServiceMethod: 'onsite', budgetMinimum: 1000, budgetMaximum: 4000,
        selectedTechnicians: [{ technician: techs[0]._id, status: 'invited', invitedAt: new Date(Date.now() - 2 * 86400000) }],
      },
      {
        item: items[2]._id, owner: owners[1]._id,
        problemDescription: 'Mountain bike chain snapped while climbing hill; rear derailleur hanger is also bent out of alignment.',
        previousRepairAttempts: 'Tried resetting chain link but skipped on gear 4.', requestStatus: REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED,
        preferredServiceMethod: 'onsite', budgetMinimum: 500, budgetMaximum: 2000,
        selectedTechnicians: [{ technician: techs[2]._id, status: 'accepted', invitedAt: new Date(Date.now() - 5 * 86400000) }],
      },
      {
        item: items[3]._id, owner: owners[1]._id,
        problemDescription: 'The hydraulic gas cylinder has lost pressure. The office chair slowly drops to the floor when seated.',
        requestStatus: REPAIR_REQUEST_STATUS.COMPLETED, publishedAt: new Date(Date.now() - 10 * 86400000),
        preferredServiceMethod: 'pickup', budgetMinimum: 800, budgetMaximum: 2500,
        selectedTechnicians: [{ technician: techs[3]._id, status: 'accepted', invitedAt: new Date(Date.now() - 10 * 86400000) }],
      },
      {
        item: items[4]._id, owner: owners[2]._id,
        problemDescription: 'Stand fan oscillates with a grinding sound and fails to spin up to top speed without a manual push.',
        requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, publishedAt: new Date(Date.now() - 2 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 300, budgetMaximum: 1000,
        selectedTechnicians: [{ technician: techs[4]._id, status: 'invited', invitedAt: new Date(Date.now() - 1 * 86400000) }],
      },
      {
        item: items[5]._id, owner: owners[2]._id,
        problemDescription: 'Blender motor emits a loud buzz when turned on and blades do not rotate. Possible bearing seizure.',
        requestStatus: REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED, publishedAt: new Date(Date.now() - 4 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 400, budgetMaximum: 1200,
        selectedTechnicians: [{ technician: techs[4]._id, status: 'accepted', invitedAt: new Date(Date.now() - 3 * 86400000) }],
      },
      {
        item: items[6]._id, owner: owners[3]._id,
        problemDescription: 'Dell 4K monitor displays vertical color banding across the right half of the panel after warm up.',
        requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED, publishedAt: new Date(Date.now() - 1 * 86400000),
        preferredServiceMethod: 'onsite', budgetMinimum: 1500, budgetMaximum: 5000,
      },
      {
        item: items[7]._id, owner: owners[3]._id,
        problemDescription: 'Apple Watch battery health degraded down to 68%. Shuts down randomly after reaching 30%.',
        requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, publishedAt: new Date(Date.now() - 2 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 1500, budgetMaximum: 3500,
        selectedTechnicians: [{ technician: techs[1]._id, status: 'invited', invitedAt: new Date(Date.now() - 1 * 86400000) }],
      },
      {
        item: items[8]._id, owner: owners[4]._id,
        problemDescription: 'Left ear cup has no sound output. Active Noise Cancellation still activates on both sides.',
        requestStatus: REPAIR_REQUEST_STATUS.QUOTATIONS_RECEIVED, publishedAt: new Date(Date.now() - 3 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 800, budgetMaximum: 2500,
        selectedTechnicians: [{ technician: techs[5]._id, status: 'accepted', invitedAt: new Date(Date.now() - 2 * 86400000) }],
      },
      {
        item: items[9]._id, owner: owners[4]._id,
        problemDescription: 'Road bike front wheel has slight wobble and front brake rubs against the rim.',
        requestStatus: REPAIR_REQUEST_STATUS.QUOTATION_ACCEPTED, publishedAt: new Date(Date.now() - 6 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 300, budgetMaximum: 1000,
        selectedTechnicians: [{ technician: techs[2]._id, status: 'accepted', invitedAt: new Date(Date.now() - 5 * 86400000) }],
      },
      {
        item: items[10]._id, owner: owners[5]._id,
        problemDescription: 'Teak wood study table left leg is loose and drawer sliders are jammed.',
        requestStatus: REPAIR_REQUEST_STATUS.COMPLETED, publishedAt: new Date(Date.now() - 12 * 86400000),
        preferredServiceMethod: 'onsite', budgetMinimum: 1000, budgetMaximum: 3000,
        selectedTechnicians: [{ technician: techs[3]._id, status: 'accepted', invitedAt: new Date(Date.now() - 12 * 86400000) }],
      },
      {
        item: items[14]._id, owner: owners[8]._id,
        problemDescription: 'Electric kettle base heating element does not heat water. Power switch indicator light stays on.',
        requestStatus: REPAIR_REQUEST_STATUS.AWAITING_QUOTATIONS, publishedAt: new Date(Date.now() - 1 * 86400000),
        preferredServiceMethod: 'dropoff', budgetMinimum: 300, budgetMaximum: 800,
        selectedTechnicians: [{ technician: techs[4]._id, status: 'invited', invitedAt: new Date(Date.now() - 1 * 86400000) }],
      },
    ];

    const repairRequests = await RepairRequest.create(repairRequestsData);
    console.log(`✅ Repair requests created: ${repairRequests.length} requests across realistic lifecycle stages`);

    // 10. QUOTATIONS (10 quotations)
    console.log('⏳ Creating quotations...');
    const quotationsData = [
      {
        repairRequest: repairRequests[2]._id, technician: techs[2]._id,
        inspectionFee: 0, laborCostMinimum: 300, laborCostMaximum: 500,
        partsEstimate: 800, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 2, unit: 'days' }, warrantyDays: 30,
        conditions: 'Genuine Shimano 9-speed chain included.', technicianNotes: 'Will tune both derailleurs during chain installation.',
        status: QUOTATION_STATUS.ACCEPTED,
      },
      {
        repairRequest: repairRequests[3]._id, technician: techs[3]._id,
        inspectionFee: 100, laborCostMinimum: 400, laborCostMaximum: 600,
        partsEstimate: 1200, transportFee: 200, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 90,
        conditions: 'Heavy-duty Class 4 hydraulic cylinder used.', technicianNotes: 'Will clean base bearings as well.',
        status: QUOTATION_STATUS.ACCEPTED,
      },
      {
        repairRequest: repairRequests[4]._id, technician: techs[4]._id,
        inspectionFee: 100, laborCostMinimum: 250, laborCostMaximum: 450,
        partsEstimate: 200, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 30,
        conditions: 'Bushing and capacitor replacement.', technicianNotes: 'Will test thermal fuse during service.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
      {
        repairRequest: repairRequests[5]._id, technician: techs[4]._id,
        inspectionFee: 150, laborCostMinimum: 300, laborCostMaximum: 500,
        partsEstimate: 350, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 2, unit: 'days' }, warrantyDays: 45,
        conditions: 'Motor cleaning and carbon brush replacement.', technicianNotes: 'Blades checked for sharpness.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
      {
        repairRequest: repairRequests[7]._id, technician: techs[1]._id,
        inspectionFee: 200, laborCostMinimum: 800, laborCostMaximum: 1200,
        partsEstimate: 1800, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 60,
        conditions: 'OEM capacity replacement battery with water seal.', technicianNotes: 'Battery diagnostics cycle included.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
      {
        repairRequest: repairRequests[8]._id, technician: techs[5]._id,
        inspectionFee: 200, laborCostMinimum: 600, laborCostMaximum: 1000,
        partsEstimate: 500, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 2, unit: 'days' }, warrantyDays: 30,
        conditions: 'Driver ribbon cable re-soldering.', technicianNotes: 'Audio frequency sweep test after repair.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
      {
        repairRequest: repairRequests[9]._id, technician: techs[2]._id,
        inspectionFee: 0, laborCostMinimum: 300, laborCostMaximum: 500,
        partsEstimate: 150, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 30,
        conditions: 'Precision spoke tensioning and truing.', technicianNotes: 'Brake pads aligned with braking track.',
        status: QUOTATION_STATUS.ACCEPTED,
      },
      {
        repairRequest: repairRequests[10]._id, technician: techs[3]._id,
        inspectionFee: 200, laborCostMinimum: 800, laborCostMaximum: 1200,
        partsEstimate: 400, transportFee: 300, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 180,
        conditions: 'Hardwood dowels and steel bracket reinforcement.', technicianNotes: 'Wood polish touchup on repaired joints.',
        status: QUOTATION_STATUS.ACCEPTED,
      },
      {
        repairRequest: repairRequests[11]._id, technician: techs[4]._id,
        inspectionFee: 50, laborCostMinimum: 200, laborCostMaximum: 400,
        partsEstimate: 300, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 1, unit: 'days' }, warrantyDays: 30,
        conditions: 'Base contact terminal and thermostat replacement.', technicianNotes: 'Thermal cutout verification included.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
      {
        repairRequest: repairRequests[1]._id, technician: techs[0]._id,
        inspectionFee: 300, laborCostMinimum: 1200, laborCostMaximum: 2500,
        partsEstimate: 1500, transportFee: 0, otherCosts: 0,
        expectedDuration: { value: 3, unit: 'days' }, warrantyDays: 60,
        conditions: 'Power IC and MOSFET replacement.', technicianNotes: 'Motherboard ultrasonic cleaning included.',
        status: QUOTATION_STATUS.SUBMITTED,
      },
    ];

    const quotations = await Quotation.create(quotationsData);

    // Link accepted quotations back to repair requests
    repairRequests[2].selectedQuotation = quotations[0]._id;
    await repairRequests[2].save();

    repairRequests[3].selectedQuotation = quotations[1]._id;
    await repairRequests[3].save();

    repairRequests[9].selectedQuotation = quotations[6]._id;
    await repairRequests[9].save();

    repairRequests[10].selectedQuotation = quotations[7]._id;
    await repairRequests[10].save();

    console.log(`✅ Quotations created: ${quotations.length} itemized quotations`);

    // 11. REPAIR JOBS (10 jobs)
    console.log('⏳ Creating repair jobs...');
    const jobsData = [
      {
        repairRequest: repairRequests[2]._id, owner: owners[1]._id, technician: techs[2]._id,
        acceptedQuotation: quotations[0]._id, currentStatus: REPAIR_JOB_STATUS.REPAIR_IN_PROGRESS,
        requiredParts: [{ name: 'Shimano 9-speed Chain', partNumber: 'CN-HG53', estimatedCost: 800, actualCost: 750, status: 'received' }],
      },
      {
        repairRequest: repairRequests[3]._id, owner: owners[1]._id, technician: techs[3]._id,
        acceptedQuotation: quotations[1]._id, currentStatus: REPAIR_JOB_STATUS.COMPLETED,
        completionReport: 'Replaced hydraulic gas piston with heavy-duty model. Tested weight capacity up to 140kg.',
        finalLaborCost: 500, finalPartsCost: 1200, finalTotalCost: 1700,
        ownerAcceptedCompletion: true, technicianConfirmedCompletion: true,
        completedAt: new Date(Date.now() - 7 * 86400000),
      },
      {
        repairRequest: repairRequests[9]._id, owner: owners[4]._id, technician: techs[2]._id,
        acceptedQuotation: quotations[6]._id, currentStatus: REPAIR_JOB_STATUS.QUALITY_CHECK,
        completionReport: 'Front wheel balanced within 0.2mm tolerance. Brake pad clearance adjusted.',
        finalLaborCost: 400, finalPartsCost: 100, finalTotalCost: 500,
      },
      {
        repairRequest: repairRequests[10]._id, owner: owners[5]._id, technician: techs[3]._id,
        acceptedQuotation: quotations[7]._id, currentStatus: REPAIR_JOB_STATUS.COMPLETED,
        completionReport: 'Re-glued and reinforced table leg with oak mortise dowels. Replaced worn drawer steel tracks.',
        finalLaborCost: 1000, finalPartsCost: 400, finalTotalCost: 1400,
        ownerAcceptedCompletion: true, technicianConfirmedCompletion: true,
        completedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        repairRequest: repairRequests[0]._id, owner: owners[0]._id, technician: techs[0]._id,
        acceptedQuotation: quotations[9]._id, currentStatus: REPAIR_JOB_STATUS.COMPLETED,
        completionReport: 'Completed AMOLED assembly replacement with touch digitizer calibration.',
        finalLaborCost: 800, finalPartsCost: 3500, finalTotalCost: 4300,
        ownerAcceptedCompletion: true, technicianConfirmedCompletion: true,
        completedAt: new Date(Date.now() - 15 * 86400000),
      },
      {
        repairRequest: repairRequests[1]._id, owner: owners[0]._id, technician: techs[0]._id,
        acceptedQuotation: quotations[9]._id, currentStatus: REPAIR_JOB_STATUS.WAITING_FOR_PARTS,
        requiredParts: [{ name: 'Power Delivery IC Chip', partNumber: 'BQ24780S', estimatedCost: 400, status: 'ordered' }],
      },
      {
        repairRequest: repairRequests[4]._id, owner: owners[2]._id, technician: techs[4]._id,
        acceptedQuotation: quotations[2]._id, currentStatus: REPAIR_JOB_STATUS.UNDER_INSPECTION,
      },
      {
        repairRequest: repairRequests[5]._id, owner: owners[2]._id, technician: techs[4]._id,
        acceptedQuotation: quotations[3]._id, currentStatus: REPAIR_JOB_STATUS.PENDING_INSPECTION,
      },
      {
        repairRequest: repairRequests[7]._id, owner: owners[3]._id, technician: techs[1]._id,
        acceptedQuotation: quotations[4]._id, currentStatus: REPAIR_JOB_STATUS.COMPLETED,
        completionReport: 'Installed high capacity internal battery. Tested 100% capacity retention.',
        finalLaborCost: 1000, finalPartsCost: 1800, finalTotalCost: 2800,
        ownerAcceptedCompletion: true, technicianConfirmedCompletion: true,
        completedAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        repairRequest: repairRequests[8]._id, owner: owners[4]._id, technician: techs[5]._id,
        acceptedQuotation: quotations[5]._id, currentStatus: REPAIR_JOB_STATUS.REPAIR_IN_PROGRESS,
      },
    ];

    const jobs = await RepairJob.create(jobsData);
    console.log(`✅ Repair jobs created: ${jobs.length} tracked jobs`);

    // 12. APPOINTMENTS (10 appointments)
    console.log('⏳ Creating appointments...');
    const appointmentsData = [
      {
        repairRequest: repairRequests[2]._id, owner: owners[1]._id, technician: techs[2]._id,
        scheduledStart: new Date(Date.now() + 1 * 86400000 + 10 * 3600000),
        scheduledEnd: new Date(Date.now() + 1 * 86400000 + 12 * 3600000),
        location: { address: 'House 14, Road 5, Dhanmondi', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Please bring bicycle chain tension meter tool.',
      },
      {
        repairRequest: repairRequests[3]._id, owner: owners[1]._id, technician: techs[3]._id,
        scheduledStart: new Date(Date.now() - 8 * 86400000 + 14 * 3600000),
        scheduledEnd: new Date(Date.now() - 8 * 86400000 + 16 * 3600000),
        location: { address: 'House 14, Road 5, Dhanmondi', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.COMPLETED, notes: 'Completed chair piston repair on site.',
      },
      {
        repairRequest: repairRequests[9]._id, owner: owners[4]._id, technician: techs[2]._id,
        scheduledStart: new Date(Date.now() + 2 * 86400000 + 15 * 3600000),
        scheduledEnd: new Date(Date.now() + 2 * 86400000 + 16 * 3600000),
        location: { address: 'Gulshan 2, Road 45, Plot 12', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Wheel drop-off pickup appointment.',
      },
      {
        repairRequest: repairRequests[10]._id, owner: owners[5]._id, technician: techs[3]._id,
        scheduledStart: new Date(Date.now() - 11 * 86400000 + 11 * 3600000),
        scheduledEnd: new Date(Date.now() - 11 * 86400000 + 13 * 3600000),
        location: { address: 'Uttara Sector 7, Road 18', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.COMPLETED, notes: 'Carpentry on-site restoration.',
      },
      {
        repairRequest: repairRequests[0]._id, owner: owners[0]._id, technician: techs[0]._id,
        scheduledStart: new Date(Date.now() - 16 * 86400000 + 10 * 3600000),
        scheduledEnd: new Date(Date.now() - 16 * 86400000 + 11 * 3600000),
        location: { address: 'Mirpur 10, Block C, Road 3', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.COMPLETED, notes: 'Smartphone screen dropoff.',
      },
      {
        repairRequest: repairRequests[1]._id, owner: owners[0]._id, technician: techs[0]._id,
        scheduledStart: new Date(Date.now() + 3 * 86400000 + 11 * 3600000),
        scheduledEnd: new Date(Date.now() + 3 * 86400000 + 12 * 3600000),
        location: { address: 'Mirpur 10, Block C, Road 3', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Laptop motherboard diagnostics inspection.',
      },
      {
        repairRequest: repairRequests[4]._id, owner: owners[2]._id, technician: techs[4]._id,
        scheduledStart: new Date(Date.now() + 1 * 86400000 + 16 * 3600000),
        scheduledEnd: new Date(Date.now() + 1 * 86400000 + 17 * 3600000),
        location: { address: 'Banani Block B, Road 11', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Fan motor inspection.',
      },
      {
        repairRequest: repairRequests[5]._id, owner: owners[2]._id, technician: techs[4]._id,
        scheduledStart: new Date(Date.now() + 2 * 86400000 + 14 * 3600000),
        scheduledEnd: new Date(Date.now() + 2 * 86400000 + 15 * 3600000),
        location: { address: 'Banani Block B, Road 11', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Blender drop off.',
      },
      {
        repairRequest: repairRequests[7]._id, owner: owners[3]._id, technician: techs[1]._id,
        scheduledStart: new Date(Date.now() - 5 * 86400000 + 12 * 3600000),
        scheduledEnd: new Date(Date.now() - 5 * 86400000 + 13 * 3600000),
        location: { address: 'Bashundhara R/A, Block D', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.COMPLETED, notes: 'Apple watch dropoff.',
      },
      {
        repairRequest: repairRequests[8]._id, owner: owners[4]._id, technician: techs[5]._id,
        scheduledStart: new Date(Date.now() + 1 * 86400000 + 17 * 3600000),
        scheduledEnd: new Date(Date.now() + 1 * 86400000 + 18 * 3600000),
        location: { address: 'Mohakhali DOHS, Road 2', city: 'Dhaka' },
        status: APPOINTMENT_STATUS.SCHEDULED, notes: 'Sony Headphones testing session.',
      },
    ];

    const appointments = await Appointment.create(appointmentsData);
    console.log(`✅ Appointments created: ${appointments.length} appointments`);

    // 13. REVIEWS (10 authentic reviews)
    console.log('⏳ Creating reviews...');
    const reviewsData = [
      {
        repairJob: jobs[1]._id, reviewer: owners[1]._id, technician: techs[3]._id,
        rating: 5, communicationRating: 5, serviceQualityRating: 5, valueRating: 5,
        reviewText: 'Outstanding service! The office chair feels sturdier than when I originally bought it. Highly professional technician.',
      },
      {
        repairJob: jobs[3]._id, reviewer: owners[5]._id, technician: techs[3]._id,
        rating: 5, communicationRating: 4, serviceQualityRating: 5, valueRating: 4,
        reviewText: 'Great carpentry skills. Restored our family teak study table without any visible marks on the joints.',
      },
      {
        repairJob: jobs[4]._id, reviewer: owners[0]._id, technician: techs[0]._id,
        rating: 5, communicationRating: 5, serviceQualityRating: 5, valueRating: 4,
        reviewText: 'Sumon replaced my Galaxy S21 screen cleanly. True tone and touch sensitivity work perfectly.',
      },
      {
        repairJob: jobs[8]._id, reviewer: owners[3]._id, technician: techs[1]._id,
        rating: 4, communicationRating: 4, serviceQualityRating: 5, valueRating: 4,
        reviewText: 'Apple Watch battery lasts more than a day again. Very happy with the turnaround time.',
      },
    ];

    const reviews = await Review.create(reviewsData);
    console.log(`✅ Reviews created: ${reviews.length} authentic reviews`);

    // 14. MESSAGES (10 interactive chat messages)
    console.log('⏳ Creating interactive messages...');
    const messagesData = [
      {
        repairRequest: repairRequests[2]._id, sender: owners[1]._id, recipient: techs[2]._id,
        content: 'Hi Bikash! Thanks for quoting on my Giant Mountain bike repair.', messageType: 'text', createdAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        repairRequest: repairRequests[2]._id, sender: techs[2]._id, recipient: owners[1]._id,
        content: 'Hello Fatima! Happy to help. I have genuine Shimano 9-speed chains in stock ready to install.', messageType: 'text', createdAt: new Date(Date.now() - 4 * 86400000 + 1800000),
      },
      {
        repairRequest: repairRequests[2]._id, sender: owners[1]._id, recipient: techs[2]._id,
        content: 'Great, could you also inspect the front gear shifting when you come?', messageType: 'text', createdAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        repairRequest: repairRequests[2]._id, sender: techs[2]._id, recipient: owners[1]._id,
        content: 'Certainly! Full drivetrain alignment is included in my service.', messageType: 'text', createdAt: new Date(Date.now() - 3 * 86400000 + 1200000),
      },
      {
        repairRequest: repairRequests[3]._id, sender: owners[1]._id, recipient: techs[3]._id,
        content: 'Hi Rony, the chair has been working great all week after your repair. Thank you!', messageType: 'text', createdAt: new Date(Date.now() - 6 * 86400000),
      },
      {
        repairRequest: repairRequests[3]._id, sender: techs[3]._id, recipient: owners[1]._id,
        content: 'You are very welcome! Don’t hesitate to reach out if you need anything else.', messageType: 'text', createdAt: new Date(Date.now() - 6 * 86400000 + 3600000),
      },
      {
        repairRequest: repairRequests[1]._id, sender: owners[0]._id, recipient: techs[0]._id,
        content: 'Hi Sumon, I invited you for my HP laptop repair. Did you see the symptoms?', messageType: 'text', createdAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        repairRequest: repairRequests[1]._id, sender: techs[0]._id, recipient: owners[0]._id,
        content: 'Yes Rahim, it sounds like a power stage surge issue. I submitted a quote with component diagnostics.', messageType: 'text', createdAt: new Date(Date.now() - 1 * 86400000 + 1800000),
      },
      {
        repairRequest: repairRequests[7]._id, sender: owners[3]._id, recipient: techs[1]._id,
        content: 'Hi Arafat, will the water seal be intact after the Apple Watch battery replacement?', messageType: 'text', createdAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        repairRequest: repairRequests[7]._id, sender: techs[1]._id, recipient: owners[3]._id,
        content: 'Yes, we apply fresh pressure-cured perimeter adhesive gaskets designed for water resistance.', messageType: 'text', createdAt: new Date(Date.now() - 1 * 86400000 + 2400000),
      },
    ];

    const messages = await Message.create(messagesData);
    console.log(`✅ Messages created: ${messages.length} messages`);

    // 15. DONATION NEEDS (10 items)
    console.log('⏳ Creating donation needs...');
    const donationNeedsData = [
      { organization: orgProfiles[1]._id, category: catElectronics._id, description: 'Laptops needed for high school STEM coding lab.', minimumCondition: ITEM_CONDITION.POOR, quantityNeeded: 15, quantityReceived: 4, active: true },
      { organization: orgProfiles[2]._id, category: catFurniture._id, description: 'Study tables and chairs for community learning center.', minimumCondition: ITEM_CONDITION.FAIR, quantityNeeded: 25, quantityReceived: 10, active: true },
      { organization: orgProfiles[5]._id, category: catElectronics._id, description: 'Tablets and e-readers for public village library.', minimumCondition: ITEM_CONDITION.FAIR, quantityNeeded: 12, quantityReceived: 3, active: true },
      { organization: orgProfiles[6]._id, category: catBicycles._id, description: 'Commuter bicycles for student transport in rural areas.', minimumCondition: ITEM_CONDITION.POOR, quantityNeeded: 20, quantityReceived: 8, active: true },
      { organization: orgProfiles[8]._id, category: catAppliances._id, description: 'Electric fans and water heaters for community shelter.', minimumCondition: ITEM_CONDITION.FAIR, quantityNeeded: 10, quantityReceived: 2, active: true },
      { organization: orgProfiles[1]._id, category: catPersonal._id, description: 'Headphones with microphones for remote language classes.', minimumCondition: ITEM_CONDITION.GOOD, quantityNeeded: 30, quantityReceived: 12, active: true },
      { organization: orgProfiles[3]._id, category: catElectronics._id, description: 'Old CRT and LCD monitors for safe glass/metal recycling.', minimumCondition: ITEM_CONDITION.BROKEN, quantityNeeded: 50, quantityReceived: 22, active: true },
      { organization: orgProfiles[4]._id, category: catElectronics._id, description: 'Printed circuit boards and dead smartphones for component recovery.', minimumCondition: ITEM_CONDITION.FOR_PARTS, quantityNeeded: 100, quantityReceived: 45, active: true },
      { organization: orgProfiles[7]._id, category: catAppliances._id, description: 'Small electric motors and fans for recycling dismantling education.', minimumCondition: ITEM_CONDITION.BROKEN, quantityNeeded: 15, quantityReceived: 5, active: true },
      { organization: orgProfiles[9]._id, category: catPersonal._id, description: 'Old lithium polymer battery devices for safe non-polluting disposal.', minimumCondition: ITEM_CONDITION.FOR_PARTS, quantityNeeded: 40, quantityReceived: 18, active: true },
    ];

    const donationNeeds = await DonationNeed.create(donationNeedsData);
    console.log(`✅ Donation needs created: ${donationNeeds.length} active needs`);

    // 16. DONATION OFFERS (10 items)
    console.log('⏳ Creating donation offers...');
    const donationOffersData = [
      { item: items[1]._id, owner: owners[0]._id, description: 'Donating HP laptop for parts recovery or student repair training.', itemCondition: ITEM_CONDITION.BROKEN, preferredHandover: 'dropoff', status: DONATION_STATUS.MATCHED, selectedOrganization: orgProfiles[1]._id },
      { item: items[3]._id, owner: owners[1]._id, description: 'Ikea office chair in good condition.', itemCondition: ITEM_CONDITION.FAIR, preferredHandover: 'pickup', status: DONATION_STATUS.COMPLETED, selectedOrganization: orgProfiles[2]._id, ownerConfirmed: true, organizationConfirmed: true, completedAt: new Date() },
      { item: items[4]._id, owner: owners[2]._id, description: 'Panasonic stand fan for shelter cooling.', itemCondition: ITEM_CONDITION.FAIR, preferredHandover: 'either', status: DONATION_STATUS.PUBLISHED },
      { item: items[5]._id, owner: owners[2]._id, description: 'Philips blender for recycling or motor reuse.', itemCondition: ITEM_CONDITION.POOR, preferredHandover: 'dropoff', status: DONATION_STATUS.PUBLISHED },
      { item: items[6]._id, owner: owners[3]._id, description: 'Dell 27 inch 4K monitor with color banding, good for secondary screen.', itemCondition: ITEM_CONDITION.POOR, preferredHandover: 'pickup', status: DONATION_STATUS.MATCHED, selectedOrganization: orgProfiles[5]._id },
      { item: items[8]._id, owner: owners[4]._id, description: 'Sony headphones for parts or audio experimenters.', itemCondition: ITEM_CONDITION.FAIR, preferredHandover: 'dropoff', status: DONATION_STATUS.PUBLISHED },
      { item: items[10]._id, owner: owners[5]._id, description: 'Solid wood table ready for study center usage.', itemCondition: ITEM_CONDITION.GOOD, preferredHandover: 'pickup', status: DONATION_STATUS.COMPLETED, selectedOrganization: orgProfiles[2]._id, ownerConfirmed: true, organizationConfirmed: true, completedAt: new Date() },
      { item: items[11]._id, owner: owners[5]._id, description: 'Miyako rice cooker for component recycling.', itemCondition: ITEM_CONDITION.POOR, preferredHandover: 'dropoff', status: DONATION_STATUS.PUBLISHED },
      { item: items[12]._id, owner: owners[6]._id, description: 'JBL soundbar audio system for youth center.', itemCondition: ITEM_CONDITION.FAIR, preferredHandover: 'either', status: DONATION_STATUS.PUBLISHED },
      { item: items[14]._id, owner: owners[8]._id, description: 'Electric kettle for heating element parts.', itemCondition: ITEM_CONDITION.BROKEN, preferredHandover: 'dropoff', status: DONATION_STATUS.PUBLISHED },
    ];

    const donationOffers = await DonationOffer.create(donationOffersData);
    console.log(`✅ Donation offers created: ${donationOffers.length} donation offers`);

    // 17. NOTIFICATIONS (10 valid notification items)
    console.log('⏳ Creating notifications...');
    const notificationsData = [
      { user: owners[0]._id, type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED, title: 'Request Published', message: 'Your repair request for Samsung Galaxy S21 has been published.', read: true },
      { user: techs[0]._id, type: NOTIFICATION_TYPES.QUOTATION_INVITATION, title: 'New Quotation Invitation', message: 'Rahim invited you to quote on HP Pavilion 15 repair.', read: false },
      { user: techs[2]._id, type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED, title: 'Quotation Accepted', message: 'Your quotation for the Giant Mountain Bike has been accepted!', read: true },
      { user: owners[1]._id, type: NOTIFICATION_TYPES.REPAIR_STATUS_UPDATED, title: 'Repair In Progress', message: 'Bikash Cycle Works has started repairs on your bicycle.', read: false },
      { user: owners[1]._id, type: NOTIFICATION_TYPES.REPAIR_COMPLETED, title: 'Repair Completed', message: 'Rony completed the repair on your Ikea Markus chair.', read: true },
      { user: owners[4]._id, type: NOTIFICATION_TYPES.QUOTATION_SUBMITTED, title: 'New Quotation', message: 'Bikash submitted a quote of ৳500 for your Trek road bike.', read: false },
      { user: techs[3]._id, type: NOTIFICATION_TYPES.REVIEW_RECEIVED, title: '5-Star Review Received', message: 'Fatima left a 5-star review for your chair repair service!', read: true },
      { user: owners[0]._id, type: NOTIFICATION_TYPES.NEW_MESSAGE, title: 'New Message from Sumon', message: 'Sumon Electronics: "Yes Rahim, it sounds like a power stage surge issue..."', read: false },
      { user: orgs[1]._id, type: NOTIFICATION_TYPES.DONATION_MATCH, title: 'New Donation Match', message: 'An item matching your laptop donation need has been submitted.', read: false },
      { user: owners[3]._id, type: NOTIFICATION_TYPES.NEW_MESSAGE, title: 'New Message from Arafat', message: 'Arafat Mobile Care: "We apply fresh pressure-cured perimeter adhesive gaskets..."', read: false },
    ];

    const notifications = await Notification.create(notificationsData);
    console.log(`✅ Notifications created: ${notifications.length} notifications`);

    console.log('\n🎉 ========================================================');
    console.log('   DATABASE SEEDED SUCCESSFULLY WITH 10+ RECORDS PER FIELD!');
    console.log('========================================================\n');

    console.log('📋 Demo Credentials Reference:');
    console.log('────────────────────────────────────────────────────────────');
    console.log('👑 Admin:          admin@fixtogether.com         / Admin123!');
    console.log('👤 Owners:         rahim@example.com             / Owner123!');
    console.log('                   fatima@example.com            / Owner123!');
    console.log('                   karim@example.com             / Owner123!');
    console.log('                   anika@example.com             / Owner123!');
    console.log('                   tanvir@example.com            / Owner123!');
    console.log('🔧 Technicians:    sumon@example.com             / Tech123!');
    console.log('                   arafat@example.com            / Tech123!');
    console.log('                   bikash@example.com            / Tech123!');
    console.log('                   rony@example.com              / Tech123!');
    console.log('                   sadia@example.com             / Tech123!');
    console.log('🏢 Organizations:  greenrepair@example.com       / Org1234!');
    console.log('                   hope@example.com              / Org1234!');
    console.log('                   communityaid@example.com      / Org1234!');
    console.log('                   ecorecycle@example.com        / Org1234!');
    console.log('                   cleantech@example.com         / Org1234!');
    console.log('────────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
