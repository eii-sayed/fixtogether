const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { User, ItemCategory, Thread, ThreadComment } = require('../models');

async function seedThreads(standalone = true) {
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

    // 2. Fetch users
    const users = await User.find({});
    if (users.length === 0) {
      throw new Error('No users found. Run base seed first.');
    }

    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = u;
    });

    const rahim = userMap['rahim@example.com'] || users[0];
    const fatima = userMap['fatima@example.com'] || users[1];
    const karim = userMap['karim@example.com'] || users[2];
    const anika = userMap['anika@example.com'] || users[3];
    const tanvir = userMap['tanvir@example.com'] || users[4];
    const sumon = userMap['sumon@example.com'] || users[5]; // Tech
    const arafat = userMap['arafat@example.com'] || users[6]; // Tech
    const bikash = userMap['bikash@example.com'] || users[7]; // Tech

    // 3. Clear existing threads & comments
    console.log('Clearing existing threads & comments...');
    await Thread.deleteMany({});
    await ThreadComment.deleteMany({});

    console.log('Creating rich community forum threads & discussions...');

    // Thread 1: LG Refrigerator Cooling (Solved)
    const t1 = await Thread.create({
      author: rahim._id,
      title: 'LG Inverter Refrigerator cooling stopped but freezer works - is it defrost timer or evaporator fan?',
      content:
        'Hey everyone! Our LG 260L double door inverter fridge is acting up. The top freezer compartment is freezing solid, but the bottom fresh food compartment is at room temperature. We hear the compressor humming normally. Has anyone diagnosed this before? Could it be a jammed defrost drain, faulty bimetal thermostat, or bad evaporator fan motor? Any diagnostic steps would be super appreciated before calling a technician!',
      category: getCat('low-risk-appliances'),
      type: 'question',
      tags: ['refrigerator', 'cooling-issue', 'diy-diagnosis', 'lg'],
      status: 'solved',
      upvotes: [rahim._id, fatima._id, karim._id, sumon._id, anika._id],
      downvotes: [],
      upvoteScore: 5,
      viewsCount: 142,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=600&q=80',
          caption: 'Back panel of freezer compartment with ice frost build-up',
        },
      ],
    });

    // Thread 1 Comments
    const t1c1 = await ThreadComment.create({
      thread: t1._id,
      author: sumon._id, // Technician Sumon Electronics
      content:
        'Classic symptom of evaporator coil frost choking or failed defrost heater/bimetal fuse! When the defrost circuit fails, a wall of frost completely blocks the cold air duct damper leading down to the fresh compartment. Unplug the fridge for 24 hours with doors open. Take off the freezer rear panel and measure resistance across the defrost heater element (should be 150-300 ohms) and bimetal thermal fuse. If the thermal fuse has no continuity (infinite ohms), replace it!',
      type: 'answer',
      isAcceptedSolution: true,
      upvotes: [rahim._id, fatima._id, karim._id, tanvir._id],
      upvoteScore: 4,
    });

    const t1c2 = await ThreadComment.create({
      thread: t1._id,
      author: rahim._id, // OP reply
      parentComment: t1c1._id,
      content:
        'Sumon bhai, you were 100% spot on! The thermal fuse was blown open. Ordered a ৳250 replacement part, installed it and defrosted the coils. The cold air is blowing back into the bottom compartment perfectly! Thank you so much for saving us a massive service call.',
      type: 'comment',
      upvotes: [sumon._id, fatima._id],
      upvoteScore: 2,
    });

    const t1c3 = await ThreadComment.create({
      thread: t1._id,
      author: anika._id,
      content:
        'Make sure to also check the rubber drain duckbill valve behind the lower compressor tray. If dust clogs it, meltwater pools and refreezes into ice sheets.',
      type: 'suggestion',
      upvotes: [rahim._id],
      upvoteScore: 1,
    });

    t1.solvedComment = t1c1._id;
    t1.commentsCount = 3;
    await t1.save();

    // Thread 2: Bicycle Gear Slipping (Troubleshooting)
    const t2 = await Thread.create({
      author: fatima._id,
      title: 'Trek 24-speed mountain bike chain skipping gears under uphill load - cassette wear vs cable stretch?',
      content:
        'Whenever I shift into middle gears (3rd-5th) and apply heavy pedaling pressure up an incline, the chain violently jumps a tooth with a loud clunk. On flat roads with light pressure it rides fine. How do I tell whether the cassette cogs are shark-toothed or if the derailleur cable tension just needs adjustment using the barrel adjuster?',
      category: getCat('bicycles'),
      type: 'troubleshooting',
      tags: ['bicycle', 'chain-slip', 'derailleur', 'commute'],
      status: 'answered',
      upvotes: [fatima._id, bikash._id, tanvir._id],
      upvoteScore: 3,
      viewsCount: 88,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80',
          caption: 'Rear derailleur and cassette cog alignment',
        },
      ],
    });

    const t2c1 = await ThreadComment.create({
      thread: t2._id,
      author: bikash._id, // Technician Bikash Cycle Works
      content:
        'Check chain wear first with a ruler! 12 full links should measure exactly 12 inches pin-to-pin. If it stretched to 12 1/16 inches or more, the chain has elongated and worn into the rear cassette valleys. If you only replace the chain now without replacing the cassette, skipping will get even worse.',
      type: 'answer',
      upvotes: [fatima._id, tanvir._id],
      upvoteScore: 2,
    });

    const t2c2 = await ThreadComment.create({
      thread: t2._id,
      author: tanvir._id,
      parentComment: t2c1._id,
      content:
        'Also check the rear derailleur hanger alignment. If the bike was dropped on the drive side, a slightly bent hanger causes skipping specifically under torque.',
      type: 'opinion',
      upvotes: [bikash._id],
      upvoteScore: 1,
    });

    t2.commentsCount = 2;
    await t2.save();

    // Thread 3: Safety Guide: Microwave High Voltage Capacitor Discharging
    const t3 = await Thread.create({
      author: sumon._id, // Technician Sumon
      title: 'Safety Protocol: Discharging microwave high-voltage capacitor before testing door microswitches',
      content:
        'CRITICAL SAFETY ADVISORY FOR ALL DIY ENTHUSIASTS:\n\nMicrowave ovens store lethal 2,000+ Volts inside their high-voltage capacitor even when unplugged from the wall for weeks! NEVER touch internal wiring without following this protocol:\n\n1. Always disconnect power cord completely.\n2. Remove the outer metal shroud screws.\n3. Locate the HV capacitor near the magnetron.\n4. Use an insulated 20,000V rated screwdriver or dedicated 20k-ohm 10W discharge resistor probe.\n5. Firmly bridge each capacitor terminal to the metal chassis ground for 10 full seconds.\n6. Verify 0.0V with a multimeter on DC volts mode before touching microswitch spade connectors.\n\nNever cut corners on high voltage electronics!',
      category: getCat('low-risk-appliances'),
      type: 'guide',
      tags: ['safety', 'microwave', 'high-voltage', 'diy-guide'],
      status: 'open',
      isPinned: true,
      upvotes: [rahim._id, fatima._id, karim._id, anika._id, tanvir._id, arafat._id, bikash._id],
      upvoteScore: 7,
      viewsCount: 310,
    });

    const t3c1 = await ThreadComment.create({
      thread: t3._id,
      author: karim._id,
      content:
        'Thank you Sumon bhai! So many people don’t realize the capacitor holds dangerous charge long after unplugging. This post should stay permanently pinned!',
      type: 'comment',
      upvotes: [sumon._id],
      upvoteScore: 1,
    });

    t3.commentsCount = 1;
    await t3.save();

    // Thread 4: HP Pavilion 15 Display Black Screen (Solved)
    const t4 = await Thread.create({
      author: karim._id,
      title: 'HP Pavilion 15 display panel black screen after sleep mode, but power LED stays solid white',
      content:
        'Laptop powers on, power LED turns solid white, keyboard backlight flashes, and fan spins up normally. But the screen remains completely dark. Connecting via HDMI to my living room TV works and boots Windows smoothly. Is it a backlight inverter, bad eDP 30-pin display cable, or dead LCD matrix panel?',
      category: getCat('electronics'),
      type: 'question',
      tags: ['laptop', 'hp', 'display', 'black-screen'],
      status: 'solved',
      upvotes: [karim._id, arafat._id, rahim._id],
      upvoteScore: 3,
      viewsCount: 195,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
          caption: 'External monitor shows display, but laptop LCD is dark',
        },
      ],
    });

    const t4c1 = await ThreadComment.create({
      thread: t4._id,
      author: arafat._id, // Technician Arafat Mobile Care
      content:
        'Do the smartphone flashlight test! Turn the laptop on in a dimly lit room, hold your phone flashlight at a 45-degree angle right against the glass. If you can faintly see the Windows desktop icons and cursor moving, your LCD matrix and GPU are fine—the LED backlight circuit or the 3A surface-mount backlight fuse on the motherboard popped!',
      type: 'answer',
      isAcceptedSolution: true,
      upvotes: [karim._id, rahim._id, sumon._id],
      upvoteScore: 3,
    });

    const t4c2 = await ThreadComment.create({
      thread: t4._id,
      author: karim._id,
      parentComment: t4c1._id,
      content:
        'Arafat bhai, that flashlight test blew my mind! I could clearly see my desktop wallpaper. Took it to a technician who found a tiny blown fuse labeled "F1" right by the eDP connector. Replaced it in 10 minutes and the screen is glowing bright again!',
      type: 'comment',
      upvotes: [arafat._id],
      upvoteScore: 1,
    });

    t4.solvedComment = t4c1._id;
    t4.commentsCount = 2;
    await t4.save();

    // Thread 5: Washing machine drum bearing repair vs donate (Discussion)
    const t5 = await Thread.create({
      author: anika._id,
      title: 'Is it worth repairing an 8-year-old washing machine with noisy drum bearings or donate for parts?',
      content:
        'Our front-load washing machine sounds like a jet engine taking off during the 1200 RPM spin cycle. A local technician quoted ৳3,800 for drum bearing and tub seal replacement. The machine cost ৳32,000 back in 2018. Should we invest in the repair, or is it better to donate it to a community vocational repair hub for apprentice training and buy an updated inverter model?',
      category: getCat('low-risk-appliances'),
      type: 'discussion',
      tags: ['washing-machine', 'repair-vs-replace', 'decision', 'sustainability'],
      status: 'open',
      upvotes: [anika._id, fatima._id, rahim._id],
      upvoteScore: 3,
      viewsCount: 165,
    });

    const t5c1 = await ThreadComment.create({
      thread: t5._id,
      author: rahim._id,
      content:
        'Definitely repair it! ৳3,800 is less than 12% of the cost of a new machine. Modern washing machines often have sealed plastic outer tubs that cannot be serviced, whereas older models have split tubs that make bearing swaps straightforward.',
      type: 'opinion',
      upvotes: [anika._id, sumon._id],
      upvoteScore: 2,
    });

    const t5c2 = await ThreadComment.create({
      thread: t5._id,
      author: sumon._id, // Technician
      parentComment: t5c1._id,
      content:
        'Agreed with Rahim. Just insist that the technician installs SKF or NSK stainless steel double-sealed bearings with genuine waterproof lithium grease on the spider shaft seal.',
      type: 'suggestion',
      upvotes: [anika._id, rahim._id],
      upvoteScore: 2,
    });

    t5.commentsCount = 2;
    await t5.save();

    // Thread 6: Vintage Stereo Receiver Repair (Showcase)
    const t6 = await Thread.create({
      author: rahim._id,
      title: 'Vintage 1988 Sony stereo receiver left channel hum fixed - capacitor restoration showcase',
      content:
        'Proud of this weekend restore! Picked up a vintage 1988 Sony integrated stereo amplifier from a neighborhood scrap collector for ৳1,200. The left audio channel had an intolerable 50Hz AC mains hum.\n\nPopped the top cover, immediately spotted two bulging 6800uF 50V power supply filter capacitors leaking electrolyte. De-soldered them and soldered in high-grade Nichicon audio capacitors, then deoxited the volume potentiometers. Both channels now deliver warm, dead-silent background audio!',
      category: getCat('electronics'),
      type: 'showcase',
      tags: ['vintage-audio', 'amplifier', 'capacitor-replacement', 'soldering'],
      status: 'open',
      upvotes: [rahim._id, sumon._id, arafat._id, karim._id, anika._id],
      upvoteScore: 5,
      viewsCount: 220,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80',
          caption: 'Freshly soldered Nichicon audio filter capacitors in Sony amplifier',
        },
      ],
    });

    const t6c1 = await ThreadComment.create({
      thread: t6._id,
      author: sumon._id,
      content:
        'Beautiful soldering craftsmanship Rahim! Nothing beats saving 80s analog audio equipment from the scrap heap.',
      type: 'comment',
      upvotes: [rahim._id],
      upvoteScore: 1,
    });

    t6.commentsCount = 1;
    await t6.save();

    console.log(`✅ Successfully seeded 6 realistic threads and 11 threaded comments/answers across categories.`);

    if (standalone) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected cleanly.');
    }
  } catch (err) {
    console.error('Error seeding threads:', err);
    if (standalone) process.exit(1);
    throw err;
  }
}

if (require.main === module) {
  seedThreads(true);
}

module.exports = seedThreads;
