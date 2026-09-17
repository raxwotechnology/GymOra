/**
 * seedPayroll.js
 * Seeds realistic payroll data for 3 months for all coaches.
 * Also sets baseSalary on each coach, seeds salary advances, and marks
 * some months as paid so the page shows real varied data.
 *
 * Run: node server/src/data/seedPayroll.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Coach = require("../models/Coach");
const Payroll = require("../models/Payroll");
const SalaryAdvance = require("../models/SalaryAdvance");
const CoachAttendance = require("../models/CoachAttendance");
const Gym = require("../models/Gym");

// Realistic base salaries per coach (full-time vs part-time)
const SALARY_MAP = {
  "Full-time": [85000, 95000, 110000, 75000, 90000],
  "Part-time": [45000, 50000, 40000],
  "full-time": [85000, 95000, 110000, 75000, 90000],
  "part-time": [45000, 50000, 40000],
  default:     [70000, 80000, 60000, 55000, 90000]
};

const OT_RATE = 350; // LKR per overtime hour

function monthKey(monthsBack) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1),
    end:   new Date(y, m, 0, 23, 59, 59)
  };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub");
  console.log("Connected.");

  const gyms   = await Gym.find().lean();
  let inserted = 0;

  for (const gym of gyms) {
    const coaches = await Coach.find({ gym: gym._id }).lean();
    if (!coaches.length) continue;

    // ── Step 1: Assign real base salaries to coaches ──────────────────────────
    const salaries = [];
    for (let i = 0; i < coaches.length; i++) {
      const c      = coaches[i];
      const pool   = SALARY_MAP[c.employmentType] || SALARY_MAP.default;
      const salary = pool[i % pool.length];
      salaries.push(salary);
      await Coach.findByIdAndUpdate(c._id, { baseSalary: salary });
      console.log(`  ${gym.name} / ${c.name}: baseSalary = ${salary}`);
    }

    // ── Step 2: Seed salary advances for this month and last month ────────────
    const thisMonth = monthKey(0);
    const lastMonth = monthKey(1);

    const ADVANCE_REASONS = [
      { reason: "Medical emergency — advance against salary", note: "Approved by owner." },
      { reason: "Vehicle repair advance",                     note: "Deduct from next payroll." },
      { reason: "Training certification fee",                 note: "Approved." },
      { reason: "Family event — salary advance requested",    note: "Pending settlement." },
      { reason: "Emergency household expense",                note: "Fully approved." }
    ];

    for (let i = 0; i < coaches.length; i++) {
      const c = coaches[i];
      // Check existing advances this month
      const { start, end } = monthRange(lastMonth);
      const existing = await SalaryAdvance.countDocuments({ coach: c._id, date: { $gte: start, $lte: end } });
      if (existing > 0) continue;

      if (Math.random() > 0.4) { // 60% of coaches had an advance last month
        const r = ADVANCE_REASONS[i % ADVANCE_REASONS.length];
        const advAmt = Math.round((salaries[i] * (0.05 + Math.random() * 0.1)) / 100) * 100; // 5-15% of salary
        await SalaryAdvance.create({
          gym: gym._id,
          coach: c._id,
          amount: advAmt,
          date: new Date(`${lastMonth}-${String(10 + i).padStart(2, "0")}`),
          reason: r.reason,
          status: "approved",
          note: r.note
        });
        console.log(`  Advance for ${c.name}: LKR ${advAmt} (${lastMonth})`);
      }
    }

    // ── Step 3: Generate payroll for last 3 months ────────────────────────────
    for (let mo = 2; mo >= 0; mo--) {
      const month = monthKey(mo);
      const { start, end } = monthRange(month);
      const isPast  = mo > 0;
      const status  = mo === 2 ? "paid" : mo === 1 ? "approved" : "draft";

      for (let i = 0; i < coaches.length; i++) {
        const c = coaches[i];

        // Skip if already exists
        const exists = await Payroll.findOne({ gym: gym._id, coach: c._id, month });
        if (exists) { console.log(`  Skip ${c.name} ${month} (exists)`); continue; }

        // Hours from attendance
        const attRecords = await CoachAttendance.find({
          gym: gym._id, coach: c._id, status: "clocked-out",
          date: { $gte: start, $lte: end }
        }).lean();
        const totalMinutes   = attRecords.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0);
        const hoursWorked    = Math.round(totalMinutes / 60 * 10) / 10;
        const standardHours  = attRecords.length * 8;  // expected hours (8h/day)
        const overtimeHours  = Math.max(0, Math.round((hoursWorked - standardHours) * 10) / 10);

        // Advances approved for this month
        const advances = await SalaryAdvance.find({
          gym: gym._id, coach: c._id, status: "approved",
          date: { $gte: start, $lte: end }
        }).lean();
        const advancesDeducted = advances.reduce((s, a) => s + Number(a.amount || 0), 0);

        // Bonuses: performance-based — full-timers get a bonus in paid months
        const baseSalary = salaries[i];
        const isFullTime = (c.employmentType || "").toLowerCase().includes("full");
        const bonuses    = (isPast && isFullTime && Math.random() > 0.5)
          ? Math.round(baseSalary * (0.03 + Math.random() * 0.05) / 100) * 100
          : 0;
        const bonusNote  = bonuses > 0 ? "Monthly performance bonus" : "";

        // Other deductions: occasional late deductions
        const otherDeductions = (isPast && Math.random() > 0.75)
          ? Math.round((1000 + Math.random() * 2000) / 100) * 100
          : 0;
        const deductionNote   = otherDeductions > 0 ? "Late arrival deduction" : "";

        const record = new Payroll({
          gym: gym._id,
          coach: c._id,
          coachName: c.name,
          month,
          baseSalary,
          hoursWorked,
          overtimeHours,
          overtimeRate: overtimeHours > 0 ? OT_RATE : 0,
          bonuses,
          bonusNote,
          advancesDeducted,
          otherDeductions,
          deductionNote,
          status,
          paymentMethod: status === "paid" ? (["bank-transfer", "cash", "cheque"][i % 3]) : "",
          paidAt: status === "paid" ? new Date(`${month}-28`) : null,
          notes: status === "draft" ? "Auto-generated from attendance" : ""
        });
        await record.save(); // triggers pre-save grossPay/netPay computation

        // Mark those advances as deducted
        if (advances.length > 0) {
          await SalaryAdvance.updateMany({ _id: { $in: advances.map((a) => a._id) } }, { status: "deducted" });
        }

        console.log(`  ${gym.name} / ${c.name} / ${month}: net=LKR ${record.netPay.toLocaleString()} status=${status}`);
        inserted++;
      }
    }
  }

  console.log(`\nDone. Total payroll records inserted: ${inserted}`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
