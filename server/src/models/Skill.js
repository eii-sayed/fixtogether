const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      unique: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

skillSchema.index({ slug: 1 }, { unique: true });
skillSchema.index({ category: 1, active: 1 });

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
