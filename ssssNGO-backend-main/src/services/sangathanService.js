const AppSetting = require("../models/AppSetting");
const SangathanMember = require("../models/SangathanMember");
const defaults = require("../data/sangathanDefaults");

const SEED_KEY = "sangathan-members-v1";

async function ensureSangathanSeeded() {
  const state = await AppSetting.findOneAndUpdate(
    { key: SEED_KEY },
    { $setOnInsert: { key: SEED_KEY, value: { seeded: false } } },
    { upsert: true, new: true }
  );

  if (state.value?.seeded) return;

  await Promise.all(defaults.map((member) => SangathanMember.updateOne(
    { legacyKey: member.legacyKey },
    { $setOnInsert: member },
    { upsert: true }
  )));

  state.value = { seeded: true, seededAt: new Date() };
  state.markModified("value");
  await state.save();
}

module.exports = { ensureSangathanSeeded };
