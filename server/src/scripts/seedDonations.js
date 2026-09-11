const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
  User,
  Item,
  ItemCategory,
  OrganizationProfile,
  DonationNeed,
  DonationOffer,
  ImpactRecord,
} = require('../models');
const {
  DONATION_STATUS,
  ITEM_CONDITION,
  COMMUNITY_NEED_STATUS,
  ROLES,
  PROCESSING_OUTCOMES,
} = require('../constants');

async function seedDonations(standalone = true) {
  try {
    if (standalone) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    // 1. Fetch categories
    const categories = await ItemCategory.find({});
    if (categories.length === 0) {
      throw new Error('No categories found. Run base seed first.');
    }
    const catMap = {};
    categories.forEach((c) => {
      catMap[c.slug] = c._id;
    });

    const getCat = (slug) => catMap[slug] || categories[0]._id;

    // 2. Fetch organizations & owners
    const orgProfiles = await OrganizationProfile.find({}).populate('user');
    const owners = await User.find({ role: ROLES.OWNER });

    if (orgProfiles.length === 0 || owners.length === 0) {
      throw new Error('Organizations or Owners not found. Run base seed first.');
    }

    const ownerMap = {};
    for (const o of owners) {
      ownerMap[o.email] = o;
    }
    const rahim = ownerMap['rahim@example.com'] || owners[0];
    const fatima = ownerMap['fatima@example.com'] || owners[1];
    const karim = ownerMap['karim@example.com'] || owners[2];

    console.log(`Found ${orgProfiles.length} organizations and ${owners.length} owners.`);
    console.log(`Primary personas: Rahim (${rahim.email}), Fatima (${fatima.email}), Karim (${karim.email})`);

    // 3. Clear existing donation offers, needs, and impact records to cleanly reseed
    console.log('Clearing old donation collections...');
    await DonationNeed.deleteMany({});
    await DonationOffer.deleteMany({});
    await ImpactRecord.deleteMany({});

    // 4. Seed Community Needs (Posted by Organizations)
    console.log('Creating realistic Community Needs...');
    const needsData = [
      {
        organization: orgProfiles[1]._id, // Hope Donations
        category: getCat('electronics'),
        title: 'Laptops for Secondary School Coding Lab',
        description: 'Urgent requirement for functional or repairable core i3/i5 laptops for our 40-student youth programming club in Mirpur.',
        urgency: 'high',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.POOR,
        quantityRequested: 15,
        quantityAccepted: 4,
        quantityFulfilled: 2,
        beneficiaryContext: 'Low-income students learning web development and digital literacy skills.',
        pickupAvailable: true,
        targetDate: new Date(Date.now() + 14 * 86400000),
      },
      {
        organization: orgProfiles[2]._id, // Community Aid Foundation
        category: getCat('furniture'),
        title: 'Study Desks & Chairs for Community Learning Center',
        description: 'Desperately seeking sturdy study tables, desk chairs, and office chairs to furnish a free community library.',
        urgency: 'critical',
        status: COMMUNITY_NEED_STATUS.PARTIALLY_MATCHED,
        minimumCondition: ITEM_CONDITION.FAIR,
        quantityRequested: 20,
        quantityAccepted: 8,
        quantityFulfilled: 5,
        beneficiaryContext: 'Serves 120 neighborhood children for after-school tutoring.',
        pickupAvailable: true,
        targetDate: new Date(Date.now() + 7 * 86400000),
      },
      {
        organization: orgProfiles[5]._id, // TechForGood Bangladesh
        category: getCat('electronics'),
        title: 'Refurbished PC Monitors & Tablets',
        description: 'Requesting 21" to 27" desktop monitors and Android tablets for a rural digital training hub in Gazipur.',
        urgency: 'high',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.FAIR,
        quantityRequested: 12,
        quantityAccepted: 3,
        quantityFulfilled: 1,
        beneficiaryContext: 'Young adults undergoing vocational software training.',
        pickupAvailable: false,
        targetDate: new Date(Date.now() + 21 * 86400000),
      },
      {
        organization: orgProfiles[6]._id, // Village Reuse Initiative
        category: getCat('bicycles'),
        title: 'Commuter Bicycles for Rural Student Transport',
        description: 'Collecting unused, repairable single-speed and geared bicycles to distribute to students walking 5+ km to school.',
        urgency: 'high',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.POOR,
        quantityRequested: 25,
        quantityAccepted: 6,
        quantityFulfilled: 4,
        beneficiaryContext: 'High school students in rural sub-districts.',
        pickupAvailable: true,
        targetDate: new Date(Date.now() + 30 * 86400000),
      },
      {
        organization: orgProfiles[8]._id, // Urban Charity Guild
        category: getCat('low-risk-appliances'),
        title: 'Electric Stand Fans & Room Heaters for Shelter',
        description: 'Need functional electric stand fans and ceiling fans for an emergency community rehabilitation center.',
        urgency: 'medium',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.FAIR,
        quantityRequested: 10,
        quantityAccepted: 2,
        quantityFulfilled: 1,
        beneficiaryContext: 'Temporary shelter housing families displaced by weather events.',
        pickupAvailable: true,
        targetDate: new Date(Date.now() + 10 * 86400000),
      },
      {
        organization: orgProfiles[3]._id, // EcoRecycle Facility
        category: getCat('electronics'),
        title: 'Obsolete Electronics & Circuit Boards for Environmental E-Waste Diversion',
        description: 'Accepting all broken, non-repairable desktop motherboards, power supplies, and damaged gadgets for safe certified zero-landfill recycling.',
        urgency: 'low',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.FOR_PARTS,
        quantityRequested: 100,
        quantityAccepted: 45,
        quantityFulfilled: 30,
        beneficiaryContext: 'Prevents heavy metals and hazardous lead/cadmium from contaminating landfills.',
        pickupAvailable: true,
        targetDate: new Date(Date.now() + 60 * 86400000),
      },
      {
        organization: orgProfiles[0]._id, // Green Repair Group
        category: getCat('personal-devices'),
        title: 'Headphones & Audio Gear for Repair Workshops',
        description: 'Seeking wired or wireless headphones, portable speakers, and cables for free student repair cafe hands-on training.',
        urgency: 'medium',
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
        minimumCondition: ITEM_CONDITION.POOR,
        quantityRequested: 15,
        quantityAccepted: 2,
        quantityFulfilled: 0,
        beneficiaryContext: 'Hands-on skill building for aspiring electronics technicians.',
        pickupAvailable: false,
        targetDate: new Date(Date.now() + 18 * 86400000),
      },
    ];

    const seededNeeds = await DonationNeed.create(needsData);
    console.log(`Created ${seededNeeds.length} community needs.`);

    // 5. Fetch or create Items for Donation Offers
    let items = await Item.find({});
    if (items.length < 8) {
      console.log('Creating donor items...');
      const newItems = await Item.create([
        {
          owner: owners[0]._id,
          title: 'Dell Inspiron 14 - Working Condition',
          category: getCat('electronics'),
          brand: 'Dell',
          model: 'Inspiron 14',
          condition: ITEM_CONDITION.GOOD,
          images: [{ url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80' }],
          currentPathway: 'donation',
          ownershipDeclaration: true,
        },
        {
          owner: owners[1]._id,
          title: 'Solid Teak Wood Study Desk',
          category: getCat('furniture'),
          brand: 'Otobi',
          model: 'Executive Study',
          condition: ITEM_CONDITION.GOOD,
          images: [{ url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80' }],
          currentPathway: 'donation',
          ownershipDeclaration: true,
        },
      ]);
      items = [...items, ...newItems];
    }

    // 6. Seed Donation Offers across all key statuses
    console.log('Creating Donation Offers across full lifecycle...');
    const offersData = [
      // 1. PUBLISHED (Newly listed by Rahim Ahmed, open for any org to review)
      {
        item: items[0]._id,
        owner: rahim._id, // Rahim Ahmed
        category: getCat('electronics'),
        title: 'Samsung Galaxy S21 - Screen Works with HDMI',
        description: 'Phone powers on and boots fine. Outer display cracked, but can be repaired or used as a mini desktop/server or for student training.',
        itemCondition: ITEM_CONDITION.POOR,
        quantity: 1,
        estimatedWeight: 0.3,
        preferredHandover: 'either',
        status: DONATION_STATUS.PUBLISHED,
        pickupLocation: { approximateArea: 'Dhanmondi Road 27', city: 'Dhaka' },
        matchedOrganizations: [
          { organization: orgProfiles[1]._id, matchScore: 85, explanation: { summary: 'Strong match for youth training program.' } },
          { organization: orgProfiles[5]._id, matchScore: 78, explanation: { summary: 'Matches smartphone refurbishment need.' } },
        ],
      },

      // 2. MATCHED (Matched to Hope Donations, awaiting org acceptance)
      {
        item: items[1]._id,
        owner: rahim._id, // Rahim Ahmed
        category: getCat('electronics'),
        title: 'HP Pavilion 15 Core i5 Laptop',
        description: 'Older core i5 laptop. Charging port is loose, but fully functional with power adapter held firmly. Donating to school coding lab.',
        itemCondition: ITEM_CONDITION.FAIR,
        quantity: 1,
        estimatedWeight: 2.2,
        preferredHandover: 'dropoff',
        status: DONATION_STATUS.MATCHED,
        matchingNeed: seededNeeds[0]._id, // Matches Hope Donations laptop need
        selectedOrganization: orgProfiles[1]._id,
        pickupLocation: { approximateArea: 'Mirpur 10', city: 'Dhaka' },
        matchedOrganizations: [
          { organization: orgProfiles[1]._id, matchScore: 95, explanation: { summary: 'Exact match for coding lab community need.' } },
        ],
      },

      // 3. ACCEPTED (Accepted by Community Aid Foundation, awaiting handover scheduling)
      {
        item: items[3] ? items[3]._id : items[1]._id,
        owner: fatima._id, // Fatima Begum
        category: getCat('furniture'),
        title: 'Ikea Markus Ergonomic Desk Chair',
        description: 'Good condition ergonomic office chair. Fabric is clean. Gas cylinder replaced. Perfect for community library reading desk.',
        itemCondition: ITEM_CONDITION.GOOD,
        quantity: 1,
        estimatedWeight: 14.5,
        preferredHandover: 'pickup',
        status: DONATION_STATUS.ACCEPTED,
        selectedOrganization: orgProfiles[2]._id, // Community Aid Foundation
        matchingNeed: seededNeeds[1]._id,
        decision: {
          decidedAt: new Date(Date.now() - 24 * 3600000),
          decidedBy: orgProfiles[2].user?._id || rahim._id,
          reason: 'Accepted for our free community reading room',
          donorExplanation: 'Thank you Fatima! This will be placed in our children’s study corner.',
        },
        pickupLocation: { approximateArea: 'Gulshan 1, Road 23', city: 'Dhaka' },
      },

      // 4. HANDOVER_SCHEDULED (Handover scheduled with dropoff code and hub info)
      {
        item: items[2] ? items[2]._id : items[0]._id,
        owner: fatima._id, // Fatima Begum
        category: getCat('bicycles'),
        title: 'Phoenix 26" Commuter Bicycle',
        description: 'Complete bicycle, needs brake pads adjusted and new tube. Donated for rural student transportation program.',
        itemCondition: ITEM_CONDITION.FAIR,
        quantity: 1,
        estimatedWeight: 13.0,
        preferredHandover: 'dropoff',
        status: DONATION_STATUS.HANDOVER_SCHEDULED,
        selectedOrganization: orgProfiles[6]._id, // Village Reuse Initiative
        matchingNeed: seededNeeds[3]._id,
        handover: {
          method: 'dropoff',
          scheduledDate: new Date(Date.now() + 2 * 86400000),
          timeWindow: '10:00 AM - 02:00 PM',
          hubAddress: 'Village Reuse Hub, Plot 8, Block B, Mirpur 12, Dhaka',
          hubPhone: '01977777777',
          confirmationCode: 'FT-78421',
          donorNotified: true,
        },
        pickupLocation: { approximateArea: 'Banani Block C', city: 'Dhaka' },
      },

      // 5. RECEIVED (Received at Hub, ready for inspection by organization)
      {
        item: items[4] ? items[4]._id : items[0]._id,
        owner: karim._id, // Karim Hassan
        category: getCat('low-risk-appliances'),
        title: 'Panasonic Stand Fan F-400',
        description: '3-speed oscillating stand fan. Fully functional, clean blades and safety cage intact. Donated for temporary social shelter.',
        itemCondition: ITEM_CONDITION.GOOD,
        quantity: 1,
        estimatedWeight: 4.8,
        preferredHandover: 'dropoff',
        status: DONATION_STATUS.RECEIVED,
        selectedOrganization: orgProfiles[8]._id, // Urban Charity Guild
        matchingNeed: seededNeeds[4]._id,
        handover: {
          method: 'dropoff',
          scheduledDate: new Date(Date.now() - 86400000),
          timeWindow: '09:00 AM - 01:00 PM',
          hubAddress: 'Urban Charity Hub, 14 Motijheel C/A, Dhaka',
          confirmationCode: 'FT-93012',
          receivedAt: new Date(Date.now() - 12 * 3600000),
          receivedBy: orgProfiles[8].user?._id || rahim._id,
        },
        pickupLocation: { approximateArea: 'Dhanmondi', city: 'Dhaka' },
      },

      // 6. INSPECTED (Inspected by EcoRecycle, awaiting final outcome processing)
      {
        item: items[6] ? items[6]._id : items[0]._id,
        owner: karim._id, // Karim Hassan
        category: getCat('electronics'),
        title: 'Dell UltraSharp 27" 4K Monitor',
        description: 'IPS panel with slight color artifact on lower right bezel. Electronic board and power supply in excellent shape.',
        itemCondition: ITEM_CONDITION.FAIR,
        quantity: 1,
        estimatedWeight: 6.2,
        preferredHandover: 'dropoff',
        status: DONATION_STATUS.INSPECTED,
        selectedOrganization: orgProfiles[3]._id, // EcoRecycle Facility
        inspection: {
          inspectedAt: new Date(Date.now() - 6 * 3600000),
          inspectedBy: orgProfiles[3].user?._id || rahim._id,
          physicalCondition: 'fair',
          safetyClearance: true,
          outcome: 'accepted_refurbish',
          publicNotes: 'Display unit passed electrical safety checks. Power supply and controller board will be refurbished for community lab usage.',
        },
        pickupLocation: { approximateArea: 'Uttara Sector 4', city: 'Dhaka' },
      },

      // 7. COMPLETED (Processed, redistributed, and impact record created!)
      {
        item: items[5] ? items[5]._id : items[1]._id,
        owner: rahim._id, // Rahim Ahmed
        category: getCat('electronics'),
        title: 'Lenovo ThinkPad T480 Laptop',
        description: 'Complete ThinkPad laptop with charger. Battery holds 4 hours of charge. Screen and keyboard pristine.',
        itemCondition: ITEM_CONDITION.GOOD,
        quantity: 1,
        estimatedWeight: 1.8,
        preferredHandover: 'dropoff',
        status: DONATION_STATUS.COMPLETED,
        selectedOrganization: orgProfiles[1]._id, // Hope Donations
        matchingNeed: seededNeeds[0]._id,
        completedAt: new Date(Date.now() - 3 * 86400000),
        processing: {
          outcome: PROCESSING_OUTCOMES.REDISTRIBUTED,
          finalizedAt: new Date(Date.now() - 3 * 86400000),
          team: 'Hope Tech Redistribution Team',
          weightKg: 1.8,
          replacementValueEstimate: 35000,
        },
        pickupLocation: { approximateArea: 'Dhanmondi', city: 'Dhaka' },
      },

      // 8. COMPLETED (Study table redistributed to child)
      {
        item: items[7] ? items[7]._id : items[1]._id,
        owner: fatima._id, // Fatima Begum
        category: getCat('furniture'),
        title: 'Solid Wood Reading Desk & Chair Set',
        description: 'Varnished hardwood desk with 2 drawers. Donated to community library.',
        itemCondition: ITEM_CONDITION.GOOD,
        quantity: 1,
        estimatedWeight: 22.0,
        preferredHandover: 'pickup',
        status: DONATION_STATUS.COMPLETED,
        selectedOrganization: orgProfiles[2]._id, // Community Aid Foundation
        matchingNeed: seededNeeds[1]._id,
        completedAt: new Date(Date.now() - 7 * 86400000),
        processing: {
          outcome: PROCESSING_OUTCOMES.REDISTRIBUTED,
          finalizedAt: new Date(Date.now() - 7 * 86400000),
          team: 'Community Education Logistics',
          weightKg: 22.0,
          replacementValueEstimate: 12000,
        },
        pickupLocation: { approximateArea: 'Gulshan 2', city: 'Dhaka' },
      },
    ];

    const seededOffers = await DonationOffer.create(offersData);
    console.log(`Created ${seededOffers.length} donation offers across full lifecycle.`);

    // 7. Seed Impact Records for completed donations
    console.log('Creating audited Impact Records for completed donations...');
    const completedOffers = seededOffers.filter((o) => o.status === DONATION_STATUS.COMPLETED);

    for (const co of completedOffers) {
      const weight = co.processing?.weightKg || co.estimatedWeight || 2.5;
      const val = co.processing?.replacementValueEstimate || 15000;
      const co2Kg = Math.round(weight * 2.8 * 10) / 10; // Carbon savings multiplier

      await ImpactRecord.create({
        item: co.item,
        sourceDonation: co._id,
        organization: co.selectedOrganization,
        outcome: co.processing?.outcome || 'redistributed',
        weightMethod: 'estimated',
        estimatedWeight: weight,
        estimatedWasteAvoided: weight,
        estimatedReplacementCost: val,
        replacementValueEstimate: val,
        verified: true,
        verifiedAt: co.completedAt || new Date(),
        notes: 'Audited by FixTogether Environmental Impact Engine',
      });
    }

    console.log(`Created ${completedOffers.length} audited impact records.`);

    // 8. Update Organization Profile impact stats
    console.log('Updating organization impact counters...');
    for (const org of orgProfiles) {
      const orgImpactCount = await ImpactRecord.countDocuments({ organization: org._id });
      const completedCount = await DonationOffer.countDocuments({
        selectedOrganization: org._id,
        status: DONATION_STATUS.COMPLETED,
      });

      if (!org.impactStats) org.impactStats = {};
      org.impactStats.totalDonationsReceived = completedCount + 2;
      org.impactStats.totalEwasteDivertedKg = Math.round((completedCount * 12.5 + 45) * 10) / 10;
      org.impactStats.totalDevicesRefurbished = completedCount + 3;
      await org.save();
    }

    console.log('\n======================================================');
    console.log('🎉 DONATION ECOSYSTEM SEEDED SUCCESSFULLY!');
    console.log('======================================================\n');
    console.log('Demo Logins for Testing Donations:');
    console.log('------------------------------------------------------');
    console.log('1. Donors / Owners:');
    console.log('   - rahim@example.com   / Owner123! (Has published, matched & completed offers)');
    console.log('   - fatima@example.com  / Owner123! (Has scheduled handover with code FT-78421)');
    console.log('   - karim@example.com   / Owner123! (Has received fan awaiting inspection)');
    console.log('2. Donation Organizations:');
    console.log('   - hope@example.com    / Org1234! (Hope Donations: Laptops & coding lab)');
    console.log('   - communityaid@example.com / Org1234! (Community Aid: Desks & reading room)');
    console.log('   - techforgood@example.com  / Org1234! (TechForGood: Tablets & monitors)');
    console.log('3. Repair Groups:');
    console.log('   - greenrepair@example.com  / Org1234! (Green Repair: Audio & appliances)');
    console.log('4. Recycling Facilities:');
    console.log('   - ecorecycle@example.com   / Org1234! (EcoRecycle: E-waste & metal)');
    console.log('------------------------------------------------------\n');

    if (standalone) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected cleanly.');
    }
  } catch (err) {
    console.error('Error seeding donations:', err);
    if (standalone) process.exit(1);
    throw err;
  }
}

if (require.main === module) {
  seedDonations(true);
}

module.exports = seedDonations;
