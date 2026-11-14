const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/database');
const { User } = require('../models');
const { ROLES, ADMIN_PERMISSIONS } = require('../constants');

const bootstrap = async () => {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Set BOOTSTRAP_SUPER_ADMIN_EMAIL to the exact existing administrator email.');

  await connectDB();
  const user = await User.findOne({ email, role: ROLES.ADMIN });
  if (!user) throw new Error(`No administrator account found for ${email}.`);

  user.adminPermissions = [ADMIN_PERMISSIONS.SUPER_ADMIN];
  await user.save();
  console.log(`Super administrator access assigned to ${email}.`);
};

bootstrap()
  .catch((error) => {
    console.error(`Admin bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
