/**
 * seedNewData.js
 * Populates all new SuperAdmin collections while preserving existing gyms.
 * Run: node server/src/data/seedNewData.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const Gym = require("../models/Gym");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const BankDetail = require("../models/BankDetail");
const ChequePayment = require("../models/ChequePayment");
const PlatformExpense = require("../models/PlatformExpense");
const { hashPassword } = require("../utils/password");

function daysAgo(n)     { const d = new Date(); d.setDate(d.getDate() - n);   return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n);   return d; }
function monthsAgo(n)   { const d = new Date(); d.setMonth(d.getMonth() - n); return d; }
function monthsFromNow(n){ const d = new Date(); d.setMonth(d.getMonth() + n);return d; }

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub");
  console.log("Connected to MongoDB\n");

  // ── 1. Subscription Plans ────────────────────────────────────────────────
  const existingPlans = await SubscriptionPlan.countDocuments();
  if (existingPlans > 0) {
    console.log("ℹ Subscription plans already exist — skipping plan creation");
  } else {
    await SubscriptionPlan.insertMany([
      {
        name: "Starter Monthly",
        price: 4900,
        billingCycle: "monthly",
        memberLimit: 50,
        coachLimit: 3,
        features: ["Up to 50 members", "3 coach accounts", "Attendance tracking", "Basic reports", "Email support"],
        isActive: true
      },
      {
        name: "Pro Monthly",
        price: 9900,
        billingCycle: "monthly",
        memberLimit: 200,
        coachLimit: 10,
        features: ["Up to 200 members", "10 coach accounts", "Full attendance", "PDF & Excel exports", "Meal & workout plans", "Priority support"],
        isActive: true
      },
      {
        name: "Pro Quarterly",
        price: 26900,
        billingCycle: "quarterly",
        memberLimit: 200,
        coachLimit: 10,
        features: ["Up to 200 members", "10 coach accounts", "Full attendance", "PDF & Excel exports", "Meal & workout plans", "Priority support", "Save 10% vs monthly"],
        isActive: true
      },
      {
        name: "Enterprise Annual",
        price: 89900,
        billingCycle: "annual",
        memberLimit: null,
        coachLimit: null,
        features: ["Unlimited members", "Unlimited coaches", "All features", "Dedicated account manager", "Custom branding", "API access", "Save 25% vs monthly"],
        isActive: true
      },
      {
        name: "Trial",
        price: 0,
        billingCycle: "monthly",
        memberLimit: 20,
        coachLimit: 2,
        features: ["Up to 20 members", "2 coach accounts", "Basic features", "30-day trial"],
        isActive: true
      }
    ]);
    console.log("✓ Created 5 subscription plans");
  }

  // ── 2. Bank Details ──────────────────────────────────────────────────────
  const existingBanks = await BankDetail.countDocuments();
  if (existingBanks > 0) {
    console.log("ℹ Bank details already exist — skipping");
  } else {
    await BankDetail.insertMany([
      {
        bankName: "Commercial Bank of Ceylon",
        accountName: "FitnessHub (Pvt) Ltd",
        accountNumber: "1234567890",
        branchCode: "015",
        swiftCode: "CCEYLKLX",
        currency: "LKR",
        isDefault: true,
        notes: "Main operating account. All subscription payments credited here."
      },
      {
        bankName: "Sampath Bank",
        accountName: "FitnessHub (Pvt) Ltd",
        accountNumber: "0087654321",
        branchCode: "024",
        swiftCode: "BSAMLKLX",
        currency: "LKR",
        isDefault: false,
        notes: "Secondary account for expense settlements."
      },
      {
        bankName: "Bank of Ceylon",
        accountName: "FitnessHub Platform Reserve",
        accountNumber: "7700123456",
        branchCode: "001",
        swiftCode: "BCEYLKLX",
        currency: "LKR",
        isDefault: false,
        notes: "Reserve / emergency fund account."
      }
    ]);
    console.log("✓ Created 3 bank details");
  }

  // ── 3. Patch existing gyms with new profile fields ───────────────────────
  const plans = await SubscriptionPlan.find({});
  const planByName = new Map(plans.map((p) => [p.name, p]));

  const gyms = await Gym.find({});
  console.log(`\nFound ${gyms.length} existing gyms. Patching with new fields...`);

  const profileDefaults = [
    { phone: "+94 77 111 2222", website: "https://gym1.lk",   facebookUrl: "https://facebook.com/gym1", googleMapsUrl: "https://maps.google.com/?q=gym1", brNumber: "PV 00100001", description: "A leading fitness centre offering state-of-the-art equipment and expert coaches." },
    { phone: "+94 77 333 4444", website: "https://gym2.lk",   facebookUrl: "https://facebook.com/gym2", googleMapsUrl: "https://maps.google.com/?q=gym2", brNumber: "PV 00100002", description: "Community fitness hub focused on sustainable health and wellness." },
    { phone: "+94 77 555 6666", website: "",                   facebookUrl: "https://facebook.com/gym3", googleMapsUrl: "",                                brNumber: "",            description: "Modern training facility with flexible membership options." },
    { phone: "+94 77 777 8888", website: "https://gym4.lk",   facebookUrl: "",                          googleMapsUrl: "https://maps.google.com/?q=gym4", brNumber: "PV 00100004", description: "Specialising in strength training, CrossFit and group classes." }
  ];

  const planAssignments = ["Starter Monthly", "Pro Monthly", "Pro Quarterly", "Enterprise Annual", "Trial", "Starter Monthly"];

  for (let i = 0; i < gyms.length; i++) {
    const gym = gyms[i];
    const profile = profileDefaults[i % profileDefaults.length];
    const planName = planAssignments[i % planAssignments.length];
    const plan = planByName.get(planName);

    const isLastGym = i === gyms.length - 1;
    const isTrial = planName === "Trial" || isLastGym;
    const subStartMonthsAgo = isTrial ? 1 : (i + 2);
    const durationMonths = planName === "Enterprise Annual" ? 12 : planName.includes("Quarterly") ? 3 : 1;
    const subEndsAt = isTrial ? daysFromNow(5 + i * 2) : monthsFromNow(durationMonths - (subStartMonthsAgo % durationMonths));

    const billingHistory = [];
    if (plan && !isTrial) {
      for (let m = subStartMonthsAgo; m >= 1; m--) {
        const entryDate = new Date();
        entryDate.setMonth(entryDate.getMonth() - m);
        billingHistory.push({
          date: entryDate,
          amount: plan.price,
          note: `${plan.name} — auto-renewal`,
          method: m % 2 === 0 ? "bank_transfer" : "cheque"
        });
      }
    }

    await Gym.findByIdAndUpdate(gym._id, {
      phone: gym.phone || profile.phone,
      website: gym.website || profile.website,
      facebookUrl: gym.facebookUrl || profile.facebookUrl,
      googleMapsUrl: gym.googleMapsUrl || profile.googleMapsUrl,
      brNumber: gym.brNumber || profile.brNumber,
      description: gym.description || profile.description,
      ...(plan ? {
        subscriptionPlanId: plan._id,
        subscriptionStartedAt: monthsAgo(subStartMonthsAgo),
        subscriptionEndsAt: subEndsAt,
        subscriptionBillingHistory: billingHistory
      } : {}),
      ...(isTrial ? { trialEndsAt: subEndsAt } : {})
    });

    console.log(`  ✓ ${gym.name}  →  plan: ${planName}  |  ends: ${subEndsAt.toISOString().slice(0,10)}`);
  }

  // ── 4. Add a second owner to the first gym ───────────────────────────────
  const firstGym = gyms[0];
  if (firstGym) {
    const extraOwnerEmail = "partner.owner@fitnesshub.io";
    const existing = await User.findOne({ email: extraOwnerEmail });
    if (!existing) {
      await User.create({
        name: "Samanthi Perera",
        email: extraOwnerEmail,
        passwordHash: hashPassword("gym123"),
        role: "owner",
        status: "active",
        gym: firstGym._id,
        mustChangePassword: true
      });
      console.log(`\n✓ Added extra owner (Samanthi Perera) to ${firstGym.name}`);
    }
  }

  // ── 5. Cheque Payments ───────────────────────────────────────────────────
  const existingCheques = await ChequePayment.countDocuments();
  if (existingCheques > 0) {
    console.log("\nℹ Cheque payments already exist — skipping");
  } else {
    const chequeRecords = [];
    for (let i = 0; i < gyms.length; i++) {
      const gym = gyms[i];
      const plan = planByName.get(planAssignments[i % planAssignments.length]);
      const amount = plan?.price || 4900;

      if (i === 0) {
        chequeRecords.push(
          { gymId: gym._id, gymName: gym.name, chequeNumber: "CHQ-2025-001", bankName: "Sampath Bank",         amount, issuedDate: daysAgo(62), depositedDate: daysAgo(58), clearedDate: daysAgo(55), status: "cleared",   notes: "Monthly subscription – cleared" },
          { gymId: gym._id, gymName: gym.name, chequeNumber: "CHQ-2025-002", bankName: "Sampath Bank",         amount, issuedDate: daysAgo(32), depositedDate: daysAgo(28), clearedDate: null,        status: "deposited", notes: "Monthly subscription – awaiting clearance" },
          { gymId: gym._id, gymName: gym.name, chequeNumber: "CHQ-2025-003", bankName: "Sampath Bank",         amount, issuedDate: daysAgo(3),  depositedDate: null,        clearedDate: null,        status: "pending",   notes: "Latest subscription payment" }
        );
      } else if (i === 1) {
        chequeRecords.push(
          { gymId: gym._id, gymName: gym.name, chequeNumber: "CHQ-2025-004", bankName: "Commercial Bank",      amount, issuedDate: daysAgo(85), depositedDate: daysAgo(80), clearedDate: daysAgo(75), status: "cleared",   notes: "Quarterly payment – cleared" },
          { gymId: gym._id, gymName: gym.name, chequeNumber: "CHQ-2024-009", bankName: "Commercial Bank",      amount, issuedDate: daysAgo(128),depositedDate: daysAgo(124),clearedDate: null,        status: "bounced",   notes: "Bounced – re-issued as CHQ-2025-004" }
        );
      } else {
        chequeRecords.push(
          { gymId: gym._id, gymName: gym.name, chequeNumber: `CHQ-2025-00${5 + i}`, bankName: "Bank of Ceylon", amount, issuedDate: daysAgo(15), depositedDate: null, clearedDate: null, status: "pending", notes: "Pending deposit" }
        );
      }
    }

    await ChequePayment.insertMany(chequeRecords);
    console.log(`\n✓ Created ${chequeRecords.length} cheque payment records`);
  }

  // ── 6. Platform Expenses ─────────────────────────────────────────────────
  const existingExpenses = await PlatformExpense.countDocuments();
  if (existingExpenses > 0) {
    console.log("ℹ Platform expenses already exist — skipping");
  } else {
    const pfExpenses = [
      // Income: subscription fees from gyms
      ...gyms.slice(0, Math.min(gyms.length, 4)).map((g, i) => {
        const plan = planByName.get(planAssignments[i % planAssignments.length]);
        return {
          type: "income",
          title: `${g.name} – ${plan?.name || "Subscription"} (May)`,
          category: "Subscription Fee",
          amount: plan?.price || 4900,
          gymId: g._id,
          gymName: g.name,
          paymentMethod: i % 2 === 0 ? "Cheque" : "Bank Transfer",
          referenceNumber: `TXN-2025-0${i + 1}`,
          status: i === 0 ? "pending" : "paid",
          entryDate: daysAgo(i * 7 + 2),
          notes: i === 0 ? "Cheque not yet deposited" : ""
        };
      }),
      // Setup fees
      { type: "income", title: `${gyms[0]?.name} – Setup Fee`, category: "Setup Fee", amount: 10000, gymId: gyms[0]?._id, gymName: gyms[0]?.name || "", paymentMethod: "Bank Transfer", referenceNumber: "SETUP-001", status: "paid", entryDate: daysAgo(300), notes: "One-time onboarding fee" },
      ...(gyms[1] ? [{ type: "income", title: `${gyms[1].name} – Setup Fee`, category: "Setup Fee", amount: 10000, gymId: gyms[1]._id, gymName: gyms[1].name, paymentMethod: "Bank Transfer", referenceNumber: "SETUP-002", status: "paid", entryDate: daysAgo(260), notes: "" }] : []),

      // Expenses: platform running costs
      { type: "expense", title: "AWS Cloud Hosting – May 2025",           category: "Hosting",    amount: 12400, gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "AWS-2025-05", status: "paid",    entryDate: daysAgo(5),   notes: "EC2 + RDS + S3 monthly bill" },
      { type: "expense", title: "AWS Cloud Hosting – April 2025",         category: "Hosting",    amount: 11800, gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "AWS-2025-04", status: "paid",    entryDate: daysAgo(35),  notes: "" },
      { type: "expense", title: "Google Workspace – May 2025",            category: "Operations", amount: 2100,  gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "GWS-2025-05", status: "paid",    entryDate: daysAgo(5),   notes: "Team email & docs" },
      { type: "expense", title: "Facebook & Google Ads – May",            category: "Marketing",  amount: 20000, gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "ADS-2025-05", status: "pending", entryDate: daysAgo(8),   notes: "Pending settlement" },
      { type: "expense", title: "Facebook & Google Ads – April",          category: "Marketing",  amount: 18500, gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "ADS-2025-04", status: "paid",    entryDate: daysAgo(38),  notes: "" },
      { type: "expense", title: "Customer Support Agent – May",           category: "Support",    amount: 35000, gymId: null, gymName: "", paymentMethod: "Bank Transfer", referenceNumber: "SAL-2025-05", status: "pending", entryDate: daysAgo(5),   notes: "" },
      { type: "expense", title: "Customer Support Agent – April",         category: "Support",    amount: 35000, gymId: null, gymName: "", paymentMethod: "Bank Transfer", referenceNumber: "SAL-2025-04", status: "paid",    entryDate: daysAgo(40),  notes: "" },
      { type: "expense", title: "Domain & SSL Renewal",                   category: "Operations", amount: 8900,  gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "DOM-2025-01", status: "paid",    entryDate: daysAgo(120), notes: "fitnesshub.io annual renewal" },
      { type: "expense", title: "SendGrid Email Service – May",           category: "Operations", amount: 1800,  gymId: null, gymName: "", paymentMethod: "Credit Card",   referenceNumber: "SG-2025-05",  status: "paid",    entryDate: daysAgo(5),   notes: "" },
      { type: "expense", title: "Software Dev Contractor – Feature Build",category: "Other",      amount: 75000, gymId: null, gymName: "", paymentMethod: "Bank Transfer", referenceNumber: "DEV-2025-04", status: "paid",    entryDate: daysAgo(50),  notes: "SuperAdmin feature expansion" },
      { type: "expense", title: "Legal & Compliance – Annual",            category: "Other",      amount: 22000, gymId: null, gymName: "", paymentMethod: "Bank Transfer", referenceNumber: "LEG-2025-01", status: "paid",    entryDate: daysAgo(200), notes: "Annual legal retainer" }
    ];

    await PlatformExpense.insertMany(
      pfExpenses.map((e) => ({ ...e, gymId: e.gymId || undefined }))
    );
    console.log(`✓ Created ${pfExpenses.length} platform income/expense entries`);
  }

  // ── 7. Summary ───────────────────────────────────────────────────────────
  const [planCount, bankCount, chequeCount, expenseCount] = await Promise.all([
    SubscriptionPlan.countDocuments(),
    BankDetail.countDocuments(),
    ChequePayment.countDocuments(),
    PlatformExpense.countDocuments()
  ]);

  console.log("\n─────────────────────────────────────────────────────");
  console.log("Seed complete! Database now contains:");
  console.log(`  Subscription Plans : ${planCount}`);
  console.log(`  Bank Details       : ${bankCount}`);
  console.log(`  Cheque Payments    : ${chequeCount}`);
  console.log(`  Platform Expenses  : ${expenseCount}`);
  console.log(`  Gyms (existing)    : ${gyms.length}  ← patched with new fields`);
  console.log("\nAlert preview:");
  gyms.forEach((g, i) => {
    const ends = daysFromNow(5 + i * 2);
    console.log(`  ${g.name} subscription ends ${ends.toISOString().slice(0,10)}  ← will show alert`);
  });
  console.log("\nTest logins (from original seed):");
  console.log("  Super-admin : admin@fitnesshub.io  / admin123");
  console.log("─────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
