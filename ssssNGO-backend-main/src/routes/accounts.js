const express = require("express");
const path = require("path");
const auth = require("../middleware/auth");
const owner = require("../middleware/owner");
const Expense = require("../models/Expense");
const { expenseVoucherUpload } = require("../middleware/privateUpload");
const { sendPrivateFile } = require("../utils/privateFiles");

const router = express.Router();
router.use(auth, owner);

const buildQuery = (query) => {
  const filter = { archivedAt: null };
  if (query.category) filter.category = query.category;
  if (query.from || query.to) {
    filter.expenseDate = {};
    if (query.from) filter.expenseDate.$gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) filter.expenseDate.$lte = new Date(`${query.to}T23:59:59.999Z`);
  }
  if (query.month && query.year) {
    const year = Number(query.year); const month = Number(query.month) - 1;
    filter.expenseDate = { $gte: new Date(Date.UTC(year, month, 1)), $lt: new Date(Date.UTC(year, month + 1, 1)) };
  } else if (query.year) {
    const year = Number(query.year);
    filter.expenseDate = { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) };
  }
  if (query.search) filter.$text = { $search: String(query.search).slice(0, 100) };
  return filter;
};

router.get("/expenses", async (req, res) => {
  const filter = buildQuery(req.query);
  const [expenses, totals, categories] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).limit(1000),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Expense.distinct("category", { archivedAt: null }),
  ]);
  res.json({ expenses, total: totals[0]?.total || 0, count: totals[0]?.count || 0, categories });
});

router.post("/expenses", expenseVoucherUpload, async (req, res) => {
  const amount = Number(req.body.amount);
  const expenseDate = new Date(req.body.expenseDate);
  if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(expenseDate.getTime())) {
    return res.status(400).json({ message: "Valid date and amount are required" });
  }
  const expense = await Expense.create({
    expenseDate,
    category: String(req.body.category || "").trim(),
    amount,
    paidTo: String(req.body.paidTo || "").trim(),
    paymentMethod: String(req.body.paymentMethod || "").trim(),
    transactionReference: String(req.body.transactionReference || "").trim(),
    description: String(req.body.description || "").trim(),
    notes: String(req.body.notes || "").trim(),
    voucherFile: req.file?.filename || "",
    enteredBy: req.user.id,
  });
  res.status(201).json(expense);
});

router.patch("/expenses/:id", async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, archivedAt: null });
  if (!expense) return res.status(404).json({ message: "Expense not found" });
  const fields = ["expenseDate", "category", "amount", "paidTo", "paymentMethod", "transactionReference", "description", "notes"];
  const previous = {};
  fields.forEach((field) => { if (req.body[field] !== undefined) { previous[field] = expense[field]; expense[field] = req.body[field]; } });
  expense.updateHistory.push({ changedBy: req.user.id, previous });
  await expense.save();
  res.json(expense);
});

router.get("/expenses/:id/voucher", async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, archivedAt: null });
  if (!expense?.voucherFile) return res.status(404).json({ message: "Voucher not found" });
  return sendPrivateFile(res, path.resolve("uploads", "private", "expenses"), expense.voucherFile);
});

router.get("/reports/expenses.csv", async (req, res) => {
  const expenses = await Expense.find(buildQuery(req.query)).sort({ expenseDate: 1 });
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [["Date", "Category", "Amount", "Paid To", "Payment Method", "Reference", "Description"],
    ...expenses.map((item) => [item.expenseDate.toISOString().slice(0, 10), item.category, item.amount, item.paidTo, item.paymentMethod, item.transactionReference, item.description])];
  res.attachment(`expense-report-${new Date().toISOString().slice(0, 10)}.csv`);
  res.type("text/csv").send(rows.map((row) => row.map(quote).join(",")).join("\n"));
});

module.exports = router;
