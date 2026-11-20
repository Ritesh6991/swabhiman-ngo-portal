const mongoose = require("mongoose");

const ensureExamCycleIndexes = async () => {
  const ExamCycle = require("../models/ExamCycle");
  const indexes = await ExamCycle.collection.indexes();
  const yearIndex = indexes.find((index) => index.name === "year_1");
  if (yearIndex?.unique) await ExamCycle.collection.dropIndex("year_1");
  await ExamCycle.collection.createIndex({ year: 1 }, { name: "year_1" });
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ensureExamCycleIndexes();
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
