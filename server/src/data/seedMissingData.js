/**
 * seedMissingData.js
 * Fills in all empty fields and collections that have no demo data.
 * Collections covered:
 *   - AuditLog
 *   - CoachAttendance
 *   - SalaryAdvance
 *   - BankTransaction
 *   - Supplier
 *   - EmailLog
 *   - SmsLog
 *   - SystemSettings (singleton init)
 * Fields patched on existing documents:
 *   - User.address/city/country/dateOfBirth/gender/emergencyContactName/emergencyContactPhone/lastLoginAt/website
 *   - Member.phone + paymentHistory
 *   - Gym.logoUrl
 *   - Message.coachUser/memberUser/senderUser/recipientUser refs
 *   - Announcement.expiresAt/audience/pinned/ctaLabel/ctaUrl
 *   - WorkoutPlan.exercises + description
 *   - MealPlan.meals
 *   - Equipment.purchaseDate/Price/vendor/serial/location/warranty/serviceHistory/breakageHistory
 *   - Supplement.buyingPrice/supplierName/sqn/grn/supplierPriceNote
 *
 * Run: node server/src/data/seedMissingData.js
 * Or auto-called from index.js on startup (idempotent).
 */

const AuditLog = require("../models/AuditLog");
const CoachAttendance = require("../models/CoachAttendance");
const SalaryAdvance = require("../models/SalaryAdvance");
const BankTransaction = require("../models/BankTransaction");
const Supplier = require("../models/Supplier");
const EmailLog = require("../models/EmailLog");
const SmsLog = require("../models/SmsLog");
const SystemSettings = require("../models/SystemSettings");
const WorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");
const Equipment = require("../models/Equipment");
const Member = require("../models/Member");
const Supplement = require("../models/Supplement");
const Gym = require("../models/Gym");
const Coach = require("../models/Coach");
const User = require("../models/User");

// ── Date helpers ─────────────────────────────────────────────────────────────
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function atHour(daysBack, hour, minute = 0) {
  const d = daysAgo(daysBack);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── Safe trim helper ─────────────────────────────────────────────────────────
function blank(v) { return !v || String(v).trim() === ""; }

// ── WorkoutPlan exercise templates ───────────────────────────────────────────
const WORKOUT_EXERCISES = {
  "Alpha Strength Program": [
    { day: "Day 1 - Pull (Back, Biceps)", name: "Deadlift", sets: 4, reps: "4-6", rest: "3 min", notes: "Brace core, neutral spine" },
    { day: "Day 1 - Pull (Back, Biceps)", name: "Barbell Row", sets: 4, reps: "6-8", rest: "2 min", notes: "" },
    { day: "Day 1 - Pull (Back, Biceps)", name: "Lat Pulldown", sets: 3, reps: "10-12", rest: "90 sec", notes: "" },
    { day: "Day 1 - Pull (Back, Biceps)", name: "Dumbbell Curl", sets: 3, reps: "12-15", rest: "60 sec", notes: "" },
    { day: "Day 2 - Push (Chest, Shoulders, Triceps)", name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "2 min", notes: "" },
    { day: "Day 2 - Push (Chest, Shoulders, Triceps)", name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "90 sec", notes: "" },
    { day: "Day 2 - Push (Chest, Shoulders, Triceps)", name: "Overhead Press", sets: 4, reps: "8-10", rest: "90 sec", notes: "" },
    { day: "Day 2 - Push (Chest, Shoulders, Triceps)", name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60 sec", notes: "" },
    { day: "Day 3 - Legs", name: "Barbell Squat", sets: 5, reps: "5", rest: "3 min", notes: "Depth below parallel" },
    { day: "Day 3 - Legs", name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: "2 min", notes: "" },
    { day: "Day 3 - Legs", name: "Leg Press", sets: 3, reps: "12-15", rest: "90 sec", notes: "" },
    { day: "Day 4 - Upper Accessory", name: "Face Pulls", sets: 3, reps: "15-20", rest: "60 sec", notes: "Shoulder health" },
    { day: "Day 4 - Upper Accessory", name: "Cable Flyes", sets: 3, reps: "15", rest: "60 sec", notes: "" },
    { day: "Day 4 - Upper Accessory", name: "Hammer Curls", sets: 3, reps: "12", rest: "60 sec", notes: "" }
  ],
  "HIIT Shred 8-Week": [
    { day: "Day 1 - Full Body HIIT", name: "Burpees", sets: 5, reps: "15", rest: "30 sec", notes: "Explosive movement" },
    { day: "Day 1 - Full Body HIIT", name: "Kettlebell Swings", sets: 4, reps: "20", rest: "30 sec", notes: "" },
    { day: "Day 1 - Full Body HIIT", name: "Box Jumps", sets: 4, reps: "12", rest: "45 sec", notes: "" },
    { day: "Day 2 - Cardio & Core", name: "Treadmill Sprint Intervals", sets: 8, reps: "30 sec on / 30 sec off", rest: "60 sec", notes: "80% max HR" },
    { day: "Day 2 - Cardio & Core", name: "Plank", sets: 3, reps: "60 sec", rest: "30 sec", notes: "" },
    { day: "Day 2 - Cardio & Core", name: "Mountain Climbers", sets: 3, reps: "30 sec", rest: "30 sec", notes: "" },
    { day: "Day 3 - Lower Body HIIT", name: "Jump Squats", sets: 4, reps: "15", rest: "30 sec", notes: "" },
    { day: "Day 3 - Lower Body HIIT", name: "Walking Lunges", sets: 3, reps: "20/leg", rest: "45 sec", notes: "" },
    { day: "Day 4 - Upper Body HIIT", name: "Push-ups", sets: 5, reps: "20", rest: "30 sec", notes: "" },
    { day: "Day 4 - Upper Body HIIT", name: "TRX Rows", sets: 4, reps: "15", rest: "30 sec", notes: "" },
    { day: "Day 5 - Active Recovery", name: "Rowing Machine", sets: 1, reps: "20 min steady", rest: "0", notes: "Low intensity" }
  ],
  "Beginner Foundation": [
    { day: "Day 1 - Full Body A", name: "Goblet Squat", sets: 3, reps: "12", rest: "90 sec", notes: "Light dumbbell or bodyweight" },
    { day: "Day 1 - Full Body A", name: "Dumbbell Row", sets: 3, reps: "10/arm", rest: "90 sec", notes: "" },
    { day: "Day 1 - Full Body A", name: "Push-ups", sets: 3, reps: "8-12", rest: "90 sec", notes: "Knee variation if needed" },
    { day: "Day 1 - Full Body A", name: "Dead Bug", sets: 2, reps: "8/side", rest: "60 sec", notes: "Core stability" },
    { day: "Day 2 - Full Body B", name: "Hip Hinge (Romanian Deadlift)", sets: 3, reps: "12", rest: "90 sec", notes: "Learn the hip hinge pattern" },
    { day: "Day 2 - Full Body B", name: "Lat Pulldown", sets: 3, reps: "12", rest: "90 sec", notes: "" },
    { day: "Day 2 - Full Body B", name: "Dumbbell Press", sets: 3, reps: "10", rest: "90 sec", notes: "" },
    { day: "Day 3 - Conditioning", name: "Treadmill Walk Incline", sets: 1, reps: "20 min", rest: "0", notes: "Brisk pace, 5% incline" },
    { day: "Day 3 - Conditioning", name: "Bodyweight Squat", sets: 2, reps: "15", rest: "60 sec", notes: "" },
    { day: "Day 3 - Conditioning", name: "Plank", sets: 2, reps: "30 sec", rest: "60 sec", notes: "" }
  ],
  "Powerlifting Peaking": [
    { day: "Day 1 - Squat (Heavy)", name: "Competition Squat", sets: 5, reps: "3", rest: "4 min", notes: "Work to 90% 1RM" },
    { day: "Day 1 - Squat (Heavy)", name: "Pause Squat", sets: 3, reps: "2", rest: "3 min", notes: "3 sec pause at bottom" },
    { day: "Day 1 - Squat (Heavy)", name: "Leg Press", sets: 3, reps: "8", rest: "2 min", notes: "Accessory volume" },
    { day: "Day 2 - Bench (Heavy)", name: "Competition Bench", sets: 5, reps: "3", rest: "4 min", notes: "Full pause on chest" },
    { day: "Day 2 - Bench (Heavy)", name: "Close-Grip Bench", sets: 3, reps: "5", rest: "3 min", notes: "Tricep emphasis" },
    { day: "Day 2 - Bench (Heavy)", name: "Dumbbell Row", sets: 3, reps: "10", rest: "2 min", notes: "Upper back health" },
    { day: "Day 3 - Deadlift (Heavy)", name: "Competition Deadlift", sets: 4, reps: "2", rest: "5 min", notes: "Work to 92% 1RM" },
    { day: "Day 3 - Deadlift (Heavy)", name: "Rack Pull", sets: 3, reps: "3", rest: "3 min", notes: "Lockout strength" },
    { day: "Day 4 - Technique & Accessories", name: "Speed Squat", sets: 8, reps: "2", rest: "90 sec", notes: "60% 1RM, bar speed focus" },
    { day: "Day 4 - Technique & Accessories", name: "Speed Bench", sets: 8, reps: "3", rest: "60 sec", notes: "60% 1RM" },
    { day: "Day 4 - Technique & Accessories", name: "Face Pulls", sets: 4, reps: "15", rest: "60 sec", notes: "" }
  ],
  "Functional Fitness": [
    { day: "Day 1 - Strength & Movement", name: "Kettlebell Deadlift", sets: 4, reps: "8", rest: "90 sec", notes: "" },
    { day: "Day 1 - Strength & Movement", name: "Turkish Get-Up", sets: 3, reps: "3/side", rest: "90 sec", notes: "Slow and controlled" },
    { day: "Day 1 - Strength & Movement", name: "Farmer's Carry", sets: 3, reps: "40m", rest: "90 sec", notes: "" },
    { day: "Day 2 - Power & Conditioning", name: "Med Ball Slam", sets: 4, reps: "10", rest: "60 sec", notes: "" },
    { day: "Day 2 - Power & Conditioning", name: "Battle Ropes", sets: 4, reps: "30 sec", rest: "30 sec", notes: "" },
    { day: "Day 2 - Power & Conditioning", name: "Box Step-Ups", sets: 3, reps: "12/leg", rest: "60 sec", notes: "" },
    { day: "Day 3 - Mobility & Core", name: "Hip 90/90 Stretch", sets: 2, reps: "60 sec/side", rest: "30 sec", notes: "Hip mobility" },
    { day: "Day 3 - Mobility & Core", name: "Pallof Press", sets: 3, reps: "10/side", rest: "60 sec", notes: "Anti-rotation core" },
    { day: "Day 3 - Mobility & Core", name: "Single-Leg RDL", sets: 3, reps: "10/leg", rest: "60 sec", notes: "Balance + posterior chain" }
  ]
};

const PLAN_DESCRIPTIONS = {
  "Alpha Strength Program": "A 4-day push/pull/legs split focused on progressive overload across the main compound lifts. Ideal for intermediate lifters aiming to build functional strength and muscle mass over 12 weeks.",
  "HIIT Shred 8-Week": "High-intensity interval training program designed to torch body fat while preserving lean muscle. Combines cardiovascular conditioning with resistance circuits across 5 training days.",
  "Beginner Foundation": "A 6-week introductory program teaching fundamental movement patterns (squat, hinge, push, pull) in a 3-day full-body format. Perfect for new gym members with no prior training experience.",
  "Powerlifting Peaking": "Advanced 16-week peaking cycle built around the squat, bench press, and deadlift. Competition-oriented programming with heavy singles, technique work, and targeted accessory movements.",
  "Functional Fitness": "Improves real-world movement quality through kettlebell work, carries, conditioning circuits, and mobility drills. Three training days per week with emphasis on longevity and athletic movement."
};

const MEAL_PLAN_MEALS = {
  "Muscle Gain 3200kcal": [
    { time: "7:30 AM", name: "Breakfast", foods: ["4 eggs scrambled", "2 slices whole grain toast", "1 cup oats with honey", "1 banana"] },
    { time: "10:30 AM", name: "Mid-Morning Snack", foods: ["Greek yogurt 200g", "Mixed berries", "25g almonds"] },
    { time: "1:00 PM", name: "Lunch", foods: ["200g chicken breast", "1.5 cups brown rice", "Steamed broccoli", "Olive oil drizzle"] },
    { time: "4:00 PM", name: "Pre-Workout", foods: ["Whey protein shake", "1 large apple", "3 rice cakes"] },
    { time: "7:30 PM", name: "Dinner", foods: ["200g salmon", "250g sweet potato", "Mixed salad", "Half avocado"] },
    { time: "9:30 PM", name: "Evening Snack", foods: ["200g cottage cheese", "Casein protein shake"] }
  ],
  "Cut Protocol 1800kcal": [
    { time: "7:00 AM", name: "Breakfast", foods: ["3 egg whites + 1 whole egg", "Spinach omelette", "Black coffee or green tea"] },
    { time: "10:00 AM", name: "Morning Snack", foods: ["1 apple", "15g almonds"] },
    { time: "12:30 PM", name: "Lunch", foods: ["150g grilled chicken", "Large mixed salad", "Lemon vinaigrette", "1 slice rye bread"] },
    { time: "4:00 PM", name: "Pre-Workout Snack", foods: ["Whey protein shake (low carb)", "Half banana"] },
    { time: "7:00 PM", name: "Dinner", foods: ["150g white fish", "Steamed vegetables", "Half cup quinoa"] },
    { time: "9:00 PM", name: "Evening (Optional)", foods: ["Casein shake if hungry"] }
  ],
  "Maintenance 2400kcal": [
    { time: "7:30 AM", name: "Breakfast", foods: ["2 eggs", "Oats with fruit", "1 slice whole grain toast", "Black coffee"] },
    { time: "10:30 AM", name: "Mid-Morning", foods: ["Protein yogurt", "1 orange"] },
    { time: "1:00 PM", name: "Lunch", foods: ["150g chicken or fish", "1 cup rice or pasta", "Mixed vegetables"] },
    { time: "4:30 PM", name: "Afternoon Snack", foods: ["Handful of nuts", "1 fruit"] },
    { time: "7:00 PM", name: "Dinner", foods: ["150g lean meat", "Sweet potato or brown rice", "Salad"] }
  ],
  "Performance Fuel 2800kcal": [
    { time: "6:30 AM", name: "Pre-Workout", foods: ["Banana", "Rice cakes x2", "Black coffee"] },
    { time: "9:00 AM", name: "Post-Workout Breakfast", foods: ["Whey protein shake", "3 eggs", "Oats 100g", "Berries"] },
    { time: "12:30 PM", name: "Lunch", foods: ["180g chicken or beef", "1.5 cups brown rice", "Broccoli & carrots"] },
    { time: "3:30 PM", name: "Afternoon Fuel", foods: ["Greek yogurt", "Mixed seeds & nuts", "1 apple"] },
    { time: "7:00 PM", name: "Dinner", foods: ["200g salmon or tuna", "Sweet potato 200g", "Spinach salad with olive oil"] },
    { time: "9:00 PM", name: "Recovery Snack", foods: ["Casein protein shake", "Peanut butter on rice cake"] }
  ]
};

// ── Equipment vendor/location data ───────────────────────────────────────────
const EQUIPMENT_DETAILS = [
  { vendor: "ProGym Lanka Pvt Ltd",    location: "Main Floor – Zone A", serialNumber: "PG-PR-0012", purchasePrice: 840000, warrantyMonths: 36 },
  { vendor: "FitEquip Solutions",      location: "Cardio Zone",         serialNumber: "FE-TM-0234", purchasePrice: 1250000, warrantyMonths: 24 },
  { vendor: "TotalGym Imports",        location: "Free Weights Area",   serialNumber: "TG-DB-0007", purchasePrice: 320000, warrantyMonths: 12 },
  { vendor: "AquaFit Ceylon",          location: "Cardio Zone",         serialNumber: "AF-RW-0089", purchasePrice: 560000, warrantyMonths: 24 },
  { vendor: "ProGym Lanka Pvt Ltd",    location: "Main Floor – Zone B", serialNumber: "PG-CM-0041", purchasePrice: 920000, warrantyMonths: 36 },
  { vendor: "IronCore Equipment",      location: "Strength Area",       serialNumber: "IC-LP-0018", purchasePrice: 480000, warrantyMonths: 24 },
  { vendor: "FitEquip Solutions",      location: "Functional Training Zone", serialNumber: "FE-BR-0055", purchasePrice: 45000, warrantyMonths: 12 }
];

async function seedMissingData() {
  const gyms = await Gym.find().lean();
  if (gyms.length === 0) return { changed: 0, reason: "no gyms found" };

  const firstGym = gyms[0];
  const gymId = firstGym._id;

  let changed = 0;

  // ── 1. SystemSettings ──────────────────────────────────────────────────────
  const existingSettings = await SystemSettings.findOne();
  if (!existingSettings) {
    await SystemSettings.create({
      systemName: "FitnessHub",
      tagline: "Powering Sri Lanka's Best Gyms",
      supportEmail: "support@fitnesshub.io",
      trialDays: 30,
      primaryColor: "#2563eb",
      privacyPolicy: "https://fitnesshub.io/privacy",
      termsOfUse: "https://fitnesshub.io/terms",
      helpCenter: "https://help.fitnesshub.io"
    });
    changed++;
  }

  // ── 2. WorkoutPlan – add exercises and description ─────────────────────────
  const workoutPlans = await WorkoutPlan.find({ gym: gymId });
  for (const plan of workoutPlans) {
    let dirty = false;
    if (blank(plan.description) && PLAN_DESCRIPTIONS[plan.name]) {
      plan.description = PLAN_DESCRIPTIONS[plan.name];
      dirty = true;
    }
    if ((!Array.isArray(plan.exercises) || plan.exercises.length === 0) && WORKOUT_EXERCISES[plan.name]) {
      plan.exercises = WORKOUT_EXERCISES[plan.name];
      dirty = true;
    }
    if (dirty) { await plan.save(); changed++; }
  }

  // ── 3. MealPlan – add meals ────────────────────────────────────────────────
  const mealPlans = await MealPlan.find({ gym: gymId });
  for (const plan of mealPlans) {
    if ((!Array.isArray(plan.meals) || plan.meals.length === 0) && MEAL_PLAN_MEALS[plan.name]) {
      plan.meals = MEAL_PLAN_MEALS[plan.name];
      await plan.save();
      changed++;
    }
  }

  // ── 4. Equipment – fill purchase/vendor/location/warranty/service history ──
  const equipmentItems = await Equipment.find({ gym: gymId }).sort({ createdAt: 1 });
  for (const [i, item] of equipmentItems.entries()) {
    const details = EQUIPMENT_DETAILS[i % EQUIPMENT_DETAILS.length];
    let dirty = false;

    if (!item.purchaseDate) {
      item.purchaseDate = daysAgo(365 + i * 45);
      dirty = true;
    }
    if (!item.purchasePrice || item.purchasePrice === 0) {
      item.purchasePrice = details.purchasePrice;
      dirty = true;
    }
    if (blank(item.vendor)) {
      item.vendor = details.vendor;
      dirty = true;
    }
    if (blank(item.serialNumber)) {
      item.serialNumber = details.serialNumber;
      dirty = true;
    }
    if (blank(item.location)) {
      item.location = details.location;
      dirty = true;
    }
    if (!item.warrantyExpiresAt) {
      const purchase = item.purchaseDate || daysAgo(365);
      const warranty = new Date(purchase);
      warranty.setMonth(warranty.getMonth() + details.warrantyMonths);
      item.warrantyExpiresAt = warranty;
      dirty = true;
    }
    if (!Array.isArray(item.serviceHistory) || item.serviceHistory.length === 0) {
      const svcDate1 = daysAgo(180 + i * 10);
      const svcDate2 = item.lastService ? new Date(item.lastService) : daysAgo(60);
      item.serviceHistory = [
        {
          date: svcDate1,
          type: "inspection",
          description: "Routine 6-month inspection. Lubricated moving parts, tightened bolts.",
          cost: 3500 + i * 500,
          technician: "ProGym Lanka Service Team"
        },
        {
          date: svcDate2,
          type: "service",
          description: "Full service including cable check, bearing replacement, and safety test.",
          cost: 6500 + i * 700,
          technician: details.vendor
        }
      ];
      dirty = true;
    }
    if (!Array.isArray(item.breakageHistory) || item.breakageHistory.length === 0) {
      if (item.status === "maintenance" || item.status === "replace" || i % 3 === 0) {
        item.breakageHistory = [
          {
            reportedAt: daysAgo(30 + i * 5),
            description: item.status === "replace"
              ? "Excessive wear on cable housing. Replacement of full cable assembly required."
              : "Minor damage reported during peak hour session. Investigated and partially repaired.",
            reportedBy: "Duty Coach",
            resolvedAt: item.status === "good" ? daysAgo(20 + i * 3) : null,
            resolutionNotes: item.status === "good" ? "Repaired and cleared for use." : "Pending vendor parts."
          }
        ];
        dirty = true;
      }
    }
    if (dirty) { await item.save(); changed++; }
  }

  // ── 5. Supplement – fill missing trade fields ──────────────────────────────
  const supplements = await Supplement.find({ gym: gymId });
  const SUPP_DETAILS = [
    { buyingPrice: 14200, supplierName: "Lanka Nutrition Imports", sqn: "SQN-001-A", grn: "GRN-2026-0041", supplierPriceNote: "Bulk rate – 12+ units" },
    { buyingPrice: 6800, supplierName: "HealthPlus Distributors", sqn: "SQN-002-A", grn: "GRN-2026-0042", supplierPriceNote: "Standard trade price" },
    { buyingPrice: 8400, supplierName: "IronFuel Direct",          sqn: "SQN-003-A", grn: "GRN-2026-0043", supplierPriceNote: "Last reorder was 3 months ago" },
    { buyingPrice: 5600, supplierName: "FitLabs Sri Lanka",         sqn: "SQN-004-A", grn: "GRN-2026-0044", supplierPriceNote: "Min. order 10 units for discount" }
  ];
  for (const [i, sup] of supplements.entries()) {
    const d = SUPP_DETAILS[i % SUPP_DETAILS.length];
    let dirty = false;
    if (!sup.buyingPrice || sup.buyingPrice === 0) { sup.buyingPrice = d.buyingPrice; dirty = true; }
    if (blank(sup.supplierName)) { sup.supplierName = d.supplierName; dirty = true; }
    if (blank(sup.sqn)) { sup.sqn = d.sqn; dirty = true; }
    if (blank(sup.grn)) { sup.grn = d.grn; dirty = true; }
    if (blank(sup.supplierPriceNote)) { sup.supplierPriceNote = d.supplierPriceNote; dirty = true; }
    if (dirty) { await sup.save(); changed++; }
  }

  // ── 6. Member – add paymentHistory ────────────────────────────────────────
  const members = await Member.find({ gym: gymId });
  const PAYMENT_METHODS = ["Card", "Bank Transfer", "Cash", "Card"];
  for (const [i, member] of members.entries()) {
    if (!Array.isArray(member.paymentHistory) || member.paymentHistory.length === 0) {
      const history = [];
      const durationMonths = member.subscriptionDurationMonths || 1;
      const cycles = Math.min(3, Math.ceil((member.checkIns || 10) / 15));
      for (let c = cycles; c >= 1; c--) {
        const payDate = daysAgo(durationMonths * 30 * c);
        history.push({
          date: payDate,
          amount: member.amountPaid && c === 1 ? member.amountPaid : member.amountDue || 12000,
          method: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
          planName: member.plan || "Membership",
          months: durationMonths,
          note: c === 1 ? "" : "Renewal payment"
        });
      }
      member.paymentHistory = history;
      await member.save();
      changed++;
    }
  }

  // ── 7. Suppliers ───────────────────────────────────────────────────────────
  const existingSuppliers = await Supplier.countDocuments({ gym: gymId });
  if (existingSuppliers === 0) {
    const supplementDocs = await Supplement.find({ gym: gymId }).lean();
    const suppByName = new Map(supplementDocs.map((s) => [s.supplierName, s]));

    await Supplier.insertMany([
      {
        gym: gymId,
        name: "Lanka Nutrition Imports",
        contactName: "Priya Jayaratne",
        phone: "+94 77 200 3344",
        email: "priya@lankanutri.lk",
        address: "No. 14, Braybrooke Place, Colombo 02",
        website: "https://lankanutri.lk",
        notes: "Main whey protein and creatine supplier. Bulk discounts on 12+ unit orders. Delivery within 48 hours.",
        products: supplementDocs.filter((s) => s.supplierName === "Lanka Nutrition Imports").map((s) => ({
          supplementId: s._id,
          supplementName: s.name,
          supplierPrice: s.buyingPrice || 0,
          notes: "Preferred supplier – longest relationship"
        }))
      },
      {
        gym: gymId,
        name: "HealthPlus Distributors",
        contactName: "Nuwan Perera",
        phone: "+94 71 456 7890",
        email: "nuwan@healthplus.lk",
        address: "45, Old Kelaniya Road, Kiribathgoda",
        website: "",
        notes: "Reliable secondary supplier for performance and recovery supplements.",
        products: supplementDocs.filter((s) => s.supplierName === "HealthPlus Distributors").map((s) => ({
          supplementId: s._id,
          supplementName: s.name,
          supplierPrice: s.buyingPrice || 0,
          notes: "Standard trade pricing"
        }))
      },
      {
        gym: gymId,
        name: "IronFuel Direct",
        contactName: "Sachith Bandara",
        phone: "+94 76 900 1122",
        email: "sachith@ironfuel.lk",
        address: "22, Industrial Estate, Biyagama",
        website: "https://ironfuel.lk",
        notes: "Exclusive distributor for IronFuel pre-workout range. Lead time 5-7 business days.",
        products: supplementDocs.filter((s) => s.supplierName === "IronFuel Direct").map((s) => ({
          supplementId: s._id,
          supplementName: s.name,
          supplierPrice: s.buyingPrice || 0,
          notes: "Only supplier for this brand"
        }))
      },
      {
        gym: gymId,
        name: "FitLabs Sri Lanka",
        contactName: "Dilini Wickrama",
        phone: "+94 77 555 8899",
        email: "orders@fitlabs.lk",
        address: "88, Station Road, Nugegoda",
        website: "https://fitlabs.lk",
        notes: "Supplies BCAA and recovery range. Minimum order 10 units for bulk pricing.",
        products: supplementDocs.filter((s) => s.supplierName === "FitLabs Sri Lanka").map((s) => ({
          supplementId: s._id,
          supplementName: s.name,
          supplierPrice: s.buyingPrice || 0,
          notes: "Min. 10 unit order for discount"
        }))
      }
    ]);
    changed += 4;
  }

  // ── 8. CoachAttendance ─────────────────────────────────────────────────────
  const existingCoachAtt = await CoachAttendance.countDocuments({ gym: gymId });
  if (existingCoachAtt === 0) {
    const coaches = await Coach.find({ gym: gymId }).lean();
    const records = [];

    for (const [ci, coach] of coaches.entries()) {
      for (let day = 14; day >= 0; day--) {
        if (day % 7 === 0) continue; // skip Sundays
        const isEvenCoach = ci % 2 === 0;
        const shiftStart = isEvenCoach ? 6 : 14;
        const shiftEnd   = isEvenCoach ? 14 : 22;

        const clockIn  = atHour(day, shiftStart, 0 + (ci % 3) * 2);
        const clockOut = atHour(day, shiftEnd,   0 + (ci % 2) * 5);

        // Some days: break
        const hasBreak = day % 3 !== 0;
        const breakStart = hasBreak ? atHour(day, shiftStart + 3, 30) : null;
        const breakEnd   = hasBreak ? atHour(day, shiftStart + 4, 0) : null;

        // Calculate minutes
        const totalMs = clockOut.getTime() - clockIn.getTime();
        const breakMs = hasBreak ? (breakEnd.getTime() - breakStart.getTime()) : 0;
        const breakMinutes = Math.round(breakMs / 60000);
        const totalWorkMinutes = Math.round((totalMs - breakMs) / 60000);

        records.push({
          gym: gymId,
          coach: coach._id,
          coachName: coach.name,
          date: atHour(day, 0, 0),
          clockIn,
          clockOut,
          breakStart,
          breakEnd,
          totalWorkMinutes,
          breakMinutes,
          status: "clocked-out"
        });
      }
      // One coach still clocked-in today
      if (ci === 0) {
        const todayIn = atHour(0, 6, 5);
        records.push({
          gym: gymId,
          coach: coach._id,
          coachName: coach.name,
          date: atHour(0, 0, 0),
          clockIn: todayIn,
          clockOut: null,
          breakStart: null,
          breakEnd: null,
          totalWorkMinutes: 0,
          breakMinutes: 0,
          status: "clocked-in"
        });
      }
    }
    await CoachAttendance.insertMany(records);
    changed += records.length;
  }

  // ── 9. SalaryAdvance ──────────────────────────────────────────────────────
  const existingAdvances = await SalaryAdvance.countDocuments({ gym: gymId });
  if (existingAdvances === 0) {
    const coaches = await Coach.find({ gym: gymId }).lean();
    if (coaches.length > 0) {
      const advances = [];
      const ADVANCE_DATA = [
        { amount: 15000, reason: "Medical emergency – advance against May salary", status: "approved", note: "Approved by owner. Deduct over next 2 months." },
        { amount: 10000, reason: "Vehicle repair – requested mid-month advance",   status: "deducted", note: "Deducted from April payroll in full." },
        { amount: 8000,  reason: "Advance for training certification fee",         status: "approved", note: "To be deducted from next month." },
        { amount: 12000, reason: "Requested salary advance for family event",      status: "pending",  note: "Pending owner approval." },
        { amount: 5000,  reason: "Emergency household expense",                    status: "deducted", note: "Fully settled." }
      ];
      coaches.slice(0, Math.min(coaches.length, 5)).forEach((coach, i) => {
        const d = ADVANCE_DATA[i % ADVANCE_DATA.length];
        advances.push({
          gym: gymId,
          coach: coach._id,
          amount: d.amount,
          date: daysAgo(20 + i * 8),
          reason: d.reason,
          status: d.status,
          note: d.note
        });
      });
      await SalaryAdvance.insertMany(advances);
      changed += advances.length;
    }
  }

  // ── 10. BankTransaction ────────────────────────────────────────────────────
  const existingBankTxn = await BankTransaction.countDocuments();
  if (existingBankTxn === 0) {
    const gymDocs = await Gym.find().lean();
    const txns = [];

    // Subscription payments received from gyms
    gymDocs.forEach((gym, i) => {
      if (gym.status === "suspended") return;
      txns.push({
        type: "credit",
        amount: [4900, 9900, 26900, 89900, 4900, 4900][i] || 4900,
        description: `${gym.name} – Monthly Subscription`,
        category: "Subscription Income",
        gymId: gym._id,
        gymName: gym.name,
        paymentMethod: i % 2 === 0 ? "bank-transfer" : "cheque",
        referenceNumber: `SUB-RCV-2026-${String(i + 1).padStart(3, "0")}`,
        bankName: "Commercial Bank of Ceylon",
        accountNumber: "1234567890",
        transactionDate: daysAgo(i * 5 + 2),
        status: "completed",
        notes: `${gym.plan || "Starter"} plan renewal`
      });
    });

    // Platform operating expenses (debit)
    const PLATFORM_DEBITS = [
      { amount: 12400, description: "AWS Cloud Hosting – May 2026",          category: "Hosting",    paymentMethod: "card",          referenceNumber: "AWS-MAY-2026",  notes: "EC2 + RDS monthly bill" },
      { amount: 35000, description: "Support Staff Payroll – May 2026",       category: "Payroll",    paymentMethod: "bank-transfer", referenceNumber: "PAY-SUP-0526",  notes: "" },
      { amount: 20000, description: "Digital Marketing – May 2026",           category: "Marketing",  paymentMethod: "card",          referenceNumber: "ADS-MAY-2026",  notes: "Facebook & Google Ads" },
      { amount: 2100,  description: "Google Workspace – May 2026",            category: "Operations", paymentMethod: "card",          referenceNumber: "GWS-MAY-2026",  notes: "" },
      { amount: 1800,  description: "SendGrid Email Service – May 2026",      category: "Operations", paymentMethod: "card",          referenceNumber: "SG-MAY-2026",   notes: "" },
      { amount: 8900,  description: "Domain & SSL Annual Renewal",            category: "Operations", paymentMethod: "card",          referenceNumber: "DOM-2026-01",   notes: "fitnesshub.io renewal" },
      { amount: 75000, description: "Software Contractor Invoice – Q2 Build", category: "Other",      paymentMethod: "bank-transfer", referenceNumber: "DEV-Q2-2026",   notes: "Feature development sprint" },
      { amount: 22000, description: "Legal & Compliance Retainer",            category: "Other",      paymentMethod: "bank-transfer", referenceNumber: "LEG-2026-01",   notes: "Annual legal retainer" }
    ];
    PLATFORM_DEBITS.forEach((d, i) => {
      txns.push({
        type: "debit",
        amount: d.amount,
        description: d.description,
        category: d.category,
        gymId: null,
        gymName: "",
        paymentMethod: d.paymentMethod,
        referenceNumber: d.referenceNumber,
        bankName: i < 3 ? "Commercial Bank of Ceylon" : "Sampath Bank",
        accountNumber: i < 3 ? "1234567890" : "0087654321",
        transactionDate: daysAgo(i * 3 + 1),
        status: i === 3 ? "pending" : "completed",
        notes: d.notes
      });
    });

    // One reversed/failed transaction for completeness
    txns.push({
      type: "credit",
      amount: 9900,
      description: "FlexZone Fitness – Pro Subscription (reversed)",
      category: "Subscription Income",
      gymId: gymDocs[1]?._id || null,
      gymName: gymDocs[1]?.name || "",
      paymentMethod: "cheque",
      referenceNumber: "CHQ-REV-001",
      bankName: "Commercial Bank of Ceylon",
      accountNumber: "1234567890",
      transactionDate: daysAgo(90),
      status: "reversed",
      notes: "Cheque bounced – reissued separately"
    });

    await BankTransaction.insertMany(txns);
    changed += txns.length;
  }

  // ── 11. EmailLog ───────────────────────────────────────────────────────────
  const existingEmails = await EmailLog.countDocuments();
  if (existingEmails === 0) {
    const gymDocs = await Gym.find().lean();

    const emails = [];

    // Welcome emails for all gyms
    gymDocs.forEach((gym, i) => {
      emails.push({
        to: gym.ownerEmail || `owner${i}@fitnesshub.io`,
        subject: `Welcome to FitnessHub – ${gym.name} is now live!`,
        body: `Hi ${gym.ownerName},\n\nYour FitnessHub account for ${gym.name} has been activated. You can now log in and start managing your gym.\n\nBest regards,\nFitnessHub Team`,
        type: "welcome",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        sentAt: new Date(gym.joinedAt || daysAgo(200 + i * 30))
      });
    });

    // Trial reminders
    gymDocs.filter((g) => g.status === "trial").forEach((gym) => {
      emails.push({
        to: gym.ownerEmail,
        subject: `Your FitnessHub trial ends in 7 days – ${gym.name}`,
        body: `Hi ${gym.ownerName},\n\nYour 30-day trial expires in 7 days. Upgrade to continue accessing all features.\n\nUpgrade now: https://fitnesshub.io/upgrade\n\nFitnessHub Team`,
        type: "trial-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        sentAt: daysAgo(7)
      });
      emails.push({
        to: gym.ownerEmail,
        subject: `Final reminder – FitnessHub trial expires tomorrow`,
        body: `Hi ${gym.ownerName},\n\nThis is your final reminder that your trial expires tomorrow.\n\nFitnessHub Team`,
        type: "trial-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        sentAt: daysAgo(1)
      });
    });

    // Subscription reminders for active gyms
    gymDocs.filter((g) => g.status === "active").slice(0, 3).forEach((gym, i) => {
      emails.push({
        to: gym.ownerEmail,
        subject: `FitnessHub subscription renewal – ${gym.name}`,
        body: `Hi ${gym.ownerName},\n\nYour subscription renews in 5 days. No action needed if payment is on file.\n\nFitnessHub Team`,
        type: "subscription-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        sentAt: daysAgo(i * 10 + 5)
      });
    });

    // Password reset email
    emails.push({
      to: "owner@fitnesshub.io",
      subject: "FitnessHub – Password Reset Request",
      body: "A password reset was requested for your account. Use the OTP: 482910 (expires in 10 minutes).",
      type: "reset-password",
      status: "sent",
      gymId: gymDocs[0]?._id || null,
      gymName: gymDocs[0]?.name || "",
      recipientName: "Kasun Jayasinghe",
      sentAt: daysAgo(15)
    });

    // One failed email
    emails.push({
      to: "invalid@bounced.example",
      subject: "FitnessHub – Welcome Email",
      body: "Welcome to FitnessHub...",
      type: "welcome",
      status: "failed",
      gymId: null,
      gymName: "",
      recipientName: "Test User",
      errorMessage: "550 5.1.1 The email account does not exist",
      sentAt: daysAgo(30)
    });

    await EmailLog.insertMany(emails);
    changed += emails.length;
  }

  // ── 12. SmsLog ─────────────────────────────────────────────────────────────
  const existingSms = await SmsLog.countDocuments();
  if (existingSms === 0) {
    const gymDocs = await Gym.find().lean();
    const smsRecords = [];

    gymDocs.slice(0, 5).forEach((gym, i) => {
      smsRecords.push({
        to: `+94 77 ${100 + i * 111} ${2000 + i * 333}`,
        message: `FitnessHub: Welcome, ${gym.ownerName}! Your ${gym.name} account is now active. Login: fitnesshub.io`,
        type: "welcome",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        provider: "Dialog Axiata",
        sentAt: new Date(gym.joinedAt || daysAgo(200))
      });
    });

    gymDocs.filter((g) => g.status === "trial").forEach((gym, i) => {
      smsRecords.push({
        to: `+94 71 ${200 + i * 123} ${4500 + i * 210}`,
        message: `FitnessHub: Hi ${gym.ownerName.split(" ")[0]}, your trial for ${gym.name} ends in 5 days. Upgrade: fitnesshub.io/upgrade`,
        type: "trial-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        provider: "Mobitel",
        sentAt: daysAgo(5)
      });
    });

    gymDocs.filter((g) => g.status === "active").slice(0, 2).forEach((gym, i) => {
      smsRecords.push({
        to: `+94 76 ${300 + i * 133} ${6600 + i * 150}`,
        message: `FitnessHub: Subscription reminder for ${gym.name}. Renewal in 3 days. Contact support@fitnesshub.io for queries.`,
        type: "subscription-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        provider: "Dialog Axiata",
        sentAt: daysAgo(i * 12 + 3)
      });
    });

    // One failed SMS
    smsRecords.push({
      to: "+94 77 000 0000",
      message: "FitnessHub: Your OTP is 192837. Valid for 10 minutes.",
      type: "reset-password",
      status: "failed",
      gymId: null,
      gymName: "",
      recipientName: "Unknown",
      provider: "Dialog Axiata",
      errorMessage: "Invalid phone number",
      sentAt: daysAgo(20)
    });

    // A few payment reminders
    gymDocs.filter((g) => g.status === "suspended").forEach((gym) => {
      smsRecords.push({
        to: `+94 77 999 8877`,
        message: `FitnessHub: Your account for ${gym.name} is suspended due to non-payment. Please contact us to restore access.`,
        type: "payment-reminder",
        status: "sent",
        gymId: gym._id,
        gymName: gym.name,
        recipientName: gym.ownerName,
        provider: "Mobitel",
        sentAt: daysAgo(10)
      });
    });

    await SmsLog.insertMany(smsRecords);
    changed += smsRecords.length;
  }

  // ── 13. AuditLog ──────────────────────────────────────────────────────────
  const existingAudit = await AuditLog.countDocuments({ gym: gymId });
  if (existingAudit === 0) {
    const superAdmin = await User.findOne({ role: "super-admin" }).lean();
    const owner = await User.findOne({ role: "owner", gym: gymId }).lean();
    const coach = await User.findOne({ role: "coach", gym: gymId }).lean();
    const members2 = await Member.find({ gym: gymId }).lean();
    const coaches2 = await Coach.find({ gym: gymId }).lean();

    const actorId = owner?._id || superAdmin?._id;
    const actorName = owner?.name || "Kasun Jayasinghe";

    if (actorId) {
      const auditEntries = [
        {
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "LOGIN",
          targetType: "User",
          targetId: String(actorId),
          targetName: actorName,
          summary: `${actorName} logged in to the owner dashboard`,
          changedFields: [],
          metadata: { ip: "192.168.1.10", browser: "Chrome 124" }
        },
        ...(members2.slice(0, 3).map((m, i) => ({
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "CREATE",
          targetType: "Member",
          targetId: String(m._id),
          targetName: m.name,
          summary: `New member ${m.name} was enrolled on the ${m.plan} plan`,
          before: null,
          after: { plan: m.plan, status: "active", goal: m.goal },
          changedFields: ["name", "plan", "status", "goal"],
          metadata: null
        }))),
        ...(coaches2.slice(0, 2).map((c) => ({
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "CREATE",
          targetType: "Coach",
          targetId: String(c._id),
          targetName: c.name,
          summary: `Coach ${c.name} was added with specialty: ${c.specialty}`,
          before: null,
          after: { specialty: c.specialty, status: c.status },
          changedFields: ["name", "specialty", "status"],
          metadata: null
        }))),
        {
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "UPDATE",
          targetType: "Member",
          targetId: String(members2[0]?._id || actorId),
          targetName: members2[0]?.name || "Member",
          summary: `Membership plan updated from 1 Month to 3 Months`,
          before: { plan: "1 Month", amountDue: 12000 },
          after: { plan: "3 Months", amountDue: 32000 },
          changedFields: ["plan", "amountDue"],
          metadata: null
        },
        {
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "UPDATE",
          targetType: "Member",
          targetId: String(members2[1]?._id || actorId),
          targetName: members2[1]?.name || "Member",
          summary: `Payment recorded – Rs. 8,000 partial payment for 1 Month plan`,
          before: { paymentStatus: "unpaid", amountPaid: 0 },
          after: { paymentStatus: "partial", amountPaid: 8000 },
          changedFields: ["paymentStatus", "amountPaid"],
          metadata: { method: "Card" }
        },
        {
          gym: gymId,
          actorUser: coach?._id || actorId,
          actorName: coach?.name || "Nethmi Perera",
          actorRole: "coach",
          action: "UPDATE",
          targetType: "Member",
          targetId: String(members2[0]?._id || actorId),
          targetName: members2[0]?.name || "Member",
          summary: `Workout plan assigned: Alpha Strength Program`,
          before: { myWorkoutPlan: null },
          after: { myWorkoutPlan: "Alpha Strength Program" },
          changedFields: ["myWorkoutPlan"],
          metadata: null
        },
        {
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "DELETE",
          targetType: "Announcement",
          targetId: "deleted-ann-001",
          targetName: "Expired Promotion – March Offer",
          summary: "Expired announcement removed from the board",
          before: { title: "Expired Promotion – March Offer", date: "2026-03-31" },
          after: null,
          changedFields: [],
          metadata: null
        },
        {
          gym: gymId,
          actorUser: actorId,
          actorName,
          actorRole: "owner",
          action: "UPDATE",
          targetType: "Equipment",
          targetId: "equip-update-001",
          targetName: "Rowing Machines",
          summary: `Equipment status changed from 'good' to 'maintenance' – service scheduled`,
          before: { status: "good" },
          after: { status: "maintenance" },
          changedFields: ["status"],
          metadata: { reason: "Cable fraying detected during daily check" }
        }
      ];

      await AuditLog.insertMany(auditEntries);
      changed += auditEntries.length;
    }
  }

  // ── 14. User – fill all blank profile fields ─────────────────────────────
  const SL_CITIES = ["Colombo", "Kandy", "Galle", "Negombo", "Kurunegala", "Jaffna", "Matara", "Batticaloa", "Ratnapura", "Anuradhapura"];
  const SL_AREAS  = [
    "Colombo 03", "Colombo 05", "Colombo 07", "Nugegoda", "Dehiwala",
    "Maharagama", "Boralesgamuwa", "Piliyandala", "Homagama", "Kaduwela"
  ];
  const SL_STREETS = [
    "No. 12, Flower Road",     "No. 34, Temple Lane",      "No. 7, Station Road",
    "No. 56, Park Avenue",     "No. 89, Marine Drive",     "No. 22, Hill Street",
    "No. 3, Lake Road",        "No. 77, College Lane",     "No. 15, Junction Road",
    "No. 41, Perera Mawatha",  "No. 28, Gamage Place",     "No. 63, Wickrama Road"
  ];
  const EMERGENCY_NAMES = [
    ["Chamara Perera", "Dilini Perera"],
    ["Ruwan Silva",    "Malini Silva"],
    ["Asela Fernando", "Thushari Fernando"],
    ["Lasith Rajapaksha", "Sandya Rajapaksha"],
    ["Nuwan Jayasinghe", "Kumari Jayasinghe"],
    ["Pradeep Wijeratne", "Nishani Wijeratne"],
    ["Saman Bandara",  "Iresha Bandara"],
    ["Kasun Senanayake", "Mala Senanayake"],
    ["Roshan Gunaratne", "Sewwandi Gunaratne"],
    ["Dilan Weerakoon", "Amali Weerakoon"]
  ];

  function buildPhone(seed) {
    const prefixes = ["70", "71", "72", "74", "75", "76", "77", "78"];
    const prefix = prefixes[seed % prefixes.length];
    const middle = String((seed * 137 + 1000) % 900 + 100);
    const last   = String((seed * 211 + 2000) % 9000 + 1000);
    return `+94 ${prefix} ${middle} ${last}`;
  }

  function buildDob(seed, minAge, maxAge) {
    const year  = 1970 + (seed % (maxAge - minAge)) + (2026 - maxAge);
    const month = (seed * 3) % 12;
    const day   = (seed * 7) % 28 + 1;
    return new Date(year, month, day);
  }

  const allUsers = await User.find().sort({ createdAt: 1 });
  for (const [i, user] of allUsers.entries()) {
    let dirty = false;
    const seed = i + 1;

    if (blank(user.address)) {
      user.address = `${SL_STREETS[i % SL_STREETS.length]}, ${SL_AREAS[i % SL_AREAS.length]}`;
      dirty = true;
    }
    if (blank(user.city)) {
      user.city = SL_CITIES[i % SL_CITIES.length];
      dirty = true;
    }
    if (blank(user.country)) {
      user.country = "Sri Lanka";
      dirty = true;
    }
    if (!user.dateOfBirth) {
      const minAge = user.role === "member" ? 18 : 25;
      const maxAge = user.role === "super-admin" ? 50 : 45;
      user.dateOfBirth = buildDob(seed, minAge, maxAge);
      dirty = true;
    }
    if (blank(user.gender)) {
      user.gender = seed % 2 === 0 ? "male" : "female";
      dirty = true;
    }
    if (blank(user.emergencyContactName)) {
      const pair = EMERGENCY_NAMES[i % EMERGENCY_NAMES.length];
      user.emergencyContactName = pair[seed % 2];
      dirty = true;
    }
    if (blank(user.emergencyContactPhone)) {
      user.emergencyContactPhone = buildPhone(seed + 50);
      dirty = true;
    }
    if (!user.lastLoginAt) {
      // super-admin logs in most recently; others spread across last 30 days
      const daysBack = user.role === "super-admin" ? 0 : (seed % 14) + 1;
      user.lastLoginAt = daysAgo(daysBack);
      dirty = true;
    }
    // owners get their gym website as personal website
    if (blank(user.website) && user.role === "owner") {
      user.website = `https://gym${i + 1}.lk`;
      dirty = true;
    }

    if (dirty) { await user.save(); changed++; }
  }

  // ── 15. Member – fill phone field ────────────────────────────────────────
  const allMembers = await Member.find().sort({ createdAt: 1 });
  for (const [i, member] of allMembers.entries()) {
    if (blank(member.phone)) {
      member.phone = buildPhone(i + 20);
      await member.save();
      changed++;
    }
  }

  // ── 16. Gym – set logoUrl placeholder ────────────────────────────────────
  const allGyms = await Gym.find();
  const GYM_LOGOS = [
    "https://ui-avatars.com/api/?name=IronPeak+Gym&background=1e3a5f&color=fff&size=128",
    "https://ui-avatars.com/api/?name=FlexZone+Fitness&background=00897b&color=fff&size=128",
    "https://ui-avatars.com/api/?name=PeakForm+Studio&background=6a1b9a&color=fff&size=128",
    "https://ui-avatars.com/api/?name=UrbanLift&background=e65100&color=fff&size=128",
    "https://ui-avatars.com/api/?name=CoreForce&background=1565c0&color=fff&size=128",
    "https://ui-avatars.com/api/?name=AthletiX+Hub&background=2e7d32&color=fff&size=128"
  ];
  for (const [i, gym] of allGyms.entries()) {
    if (blank(gym.logoUrl)) {
      gym.logoUrl = GYM_LOGOS[i % GYM_LOGOS.length];
      await gym.save();
      changed++;
    }
  }

  // ── 17. Message – link User refs ─────────────────────────────────────────
  const Msg = require("../models/Message");
  const unlinkedMessages = await Msg.find({ $or: [{ coachUser: null }, { memberUser: null }] });
  for (const msg of unlinkedMessages) {
    let dirty = false;
    if (!msg.coachUser) {
      const coachUserDoc = await User.findOne({ name: msg.coachName, role: "coach" }).lean();
      if (coachUserDoc) { msg.coachUser = coachUserDoc._id; dirty = true; }
    }
    if (!msg.memberUser) {
      const memberUserDoc = await User.findOne({ name: msg.memberName, role: "member" }).lean();
      if (memberUserDoc) { msg.memberUser = memberUserDoc._id; dirty = true; }
    }
    if (!msg.senderUser && msg.senderRole === "member" && msg.memberUser) {
      msg.senderUser = msg.memberUser; dirty = true;
    }
    if (!msg.recipientUser && msg.recipientRole === "coach" && msg.coachUser) {
      msg.recipientUser = msg.coachUser; dirty = true;
    }
    if (dirty) { await msg.save(); changed++; }
  }

  // ── 18. Announcement – fill optional fields ───────────────────────────────
  const Announcement = require("../models/Announcement");
  const announcements = await Announcement.find({ gym: gymId });
  const ANN_EXTRAS = [
    { audience: "all",     expiresAt: daysAgo(-14), pinned: true,  ctaLabel: "View Schedule",    ctaUrl: "#schedule" },
    { audience: "members", expiresAt: daysAgo(-5),  pinned: false, ctaLabel: "See Hours",        ctaUrl: "#hours" },
    { audience: "all",     expiresAt: daysAgo(-21), pinned: true,  ctaLabel: "Sign Up Now",      ctaUrl: "#challenge" }
  ];
  for (const [i, ann] of announcements.entries()) {
    const extra = ANN_EXTRAS[i % ANN_EXTRAS.length];
    let dirty = false;
    if (!ann.expiresAt)        { ann.expiresAt = extra.expiresAt;   dirty = true; }
    if (ann.audience === "all" && extra.audience !== "all") { ann.audience = extra.audience; dirty = true; }
    if (ann.pinned === false && extra.pinned) { ann.pinned = extra.pinned; dirty = true; }
    if (blank(ann.ctaLabel))   { ann.ctaLabel  = extra.ctaLabel;    dirty = true; }
    if (blank(ann.ctaUrl))     { ann.ctaUrl    = extra.ctaUrl;      dirty = true; }
    if (dirty) { await ann.save(); changed++; }
  }

  return { changed };
}

module.exports = seedMissingData;

// Allow direct execution: node server/src/data/seedMissingData.js
if (require.main === module) {
  require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
  const mongoose = require("mongoose");

  mongoose
    .connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub")
    .then(async () => {
      console.log("Connected to MongoDB\n");
      const result = await seedMissingData();
      console.log(`\nDone. Records changed / inserted: ${result.changed}`);
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error("Failed:", err.message);
      process.exit(1);
    });
}
