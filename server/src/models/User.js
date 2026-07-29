const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUS } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.OWNER,
    },
    profileImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    refreshTokens: [
      {
        token: { type: String, select: false },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        userAgent: { type: String, default: '' },
      },
    ],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// userSchema.index({ email: 1 }, { unique: true }); // Removed duplicate index, unique:true in schema definition already handles this
userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ createdAt: -1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Check if account is active
 * @returns {boolean}
 */
userSchema.methods.isActive = function () {
  return this.accountStatus === ACCOUNT_STATUS.ACTIVE;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
