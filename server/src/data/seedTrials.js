require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { hashPassword } = require("../utils/password");
const Gym = require("../models/Gym");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const TRIAL_GYMS = [
  // ── URGENT (≤2 days left) ───────────────────────────────────────────────
  {
    name: "SweatBox Gym",
    ownerName: "Lasith Bandara",
    ownerEmail: "lasith@sweatbox.lk",
    location: "Colombo 07",
    phone: "+94 77 100 2201",
    website: "www.sweatbox.lk",
    description: "Urban CrossFit and functional fitness studio targeting young professionals.",
    plan: "Pro",
    daysLeft: 1,
    trialDays: 14,
  },
  {
    name: "PowerHouse Athletics",
    ownerName: "Chamari Seneviratne",
    ownerEmail: "chamari@powerhouse.lk",
    location: "Nugegoda",
    phone: "+94 71 200 3312",
    website: "www.powerhouseathletics.lk",
    description: "Strength and conditioning facility with Olympic lifting platforms.",
    plan: "Enterprise",
    daysLeft: 2,
    trialDays: 14,
  },

  // ── ENDING SOON (3–7 days left) ─────────────────────────────────────────
  {
    name: "ZenFit Studio",
    ownerName: "Malika Perera",
    ownerEmail: "malika@zenfit.lk",
    location: "Battaramulla",
    phone: "+94 76 300 4423",
    website: "www.zenfitstudio.lk",
    description: "Yoga, Pilates, and mindful movement classes for all fitness levels.",
    plan: "Starter",
    daysLeft: 3,
    trialDays: 14,
  },
  {
    name: "EliteEdge Performance",
    ownerName: "Rukshan Mendis",
    ownerEmail: "rukshan@eliteedge.lk",
    location: "Rajagiriya",
    phone: "+94 77 400 5534",
    website: "www.eliteedge.lk",
    description: "Sports performance training for athletes and competitive sports teams.",
    plan: "Pro",
    daysLeft: 5,
    trialDays: 14,
  },
  {
    name: "FitNation Kandy",
    ownerName: "Priyantha Wickramasinghe",
    ownerEmail: "priyantha@fitnation.lk",
    location: "Kandy",
    phone: "+94 81 500 6645",
    website: "www.fitnationkandy.lk",
    description: "Multi-discipline fitness hub serving the central province community.",
    plan: "Starter",
    daysLeft: 7,
    trialDays: 14,
  },

  // ── MID-TRIAL (8–14 days left) ──────────────────────────────────────────
  {
    name: "BurnZone Fitness",
    ownerName: "Sanduni Jayawardena",
    ownerEmail: "sanduni@burnzone.lk",
    location: "Dehiwala",
    phone: "+94 72 600 7756",
    website: "www.burnzonefitness.lk",
    description: "HIIT, boxing, and cardio studio with group class focus.",
    plan: "Pro",
    daysLeft: 10,
    trialDays: 14,
  },
  {
    name: "GoldFit Center",
    ownerName: "Dilantha Rathnayake",
    ownerEmail: "dilantha@goldfit.lk",
    location: "Gampaha",
    phone: "+94 33 700 8867",
    website: "www.goldfitcenter.lk",
    description: "Traditional bodybuilding gym with modern equipment and experienced trainers.",
    plan: "Enterprise",
    daysLeft: 12,
    trialDays: 14,
  },
  {
    name: "PulseUp Wellness",
    ownerName: "Hiruni Samarasinghe",
    ownerEmail: "hiruni@pulseup.lk",
    location: "Matara",
    phone: "+94 41 800 9978",
    website: "www.pulseupwellness.lk",
    description: "Holistic wellness centre combining fitness, nutrition, and recovery.",
    plan: "Starter",
    daysLeft: 14,
    trialDays: 14,
  },
];

async function seedTrials() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const plans = await SubscriptionPlan.find().lean();
  const planMap = new Map(plans.map((p) => [p.name.toLowerCase(), p._id]));

  let created = 0;
  let skipped = 0;

  for (const config of TRIAL_GYMS) {
    const exists = await Gym.findOne({ name: config.name }).lean();
    if (exists) {
      console.log(`  Skipping "${config.name}" — already exists`);
      skipped++;
      continue;
    }

    const trialEndsAt = daysFromNow(config.daysLeft);
    const joinedAt = daysAgo(config.trialDays - config.daysLeft);

    // Find a matching subscription plan (Starter/Pro/Enterprise)
    const matchedPlanId =
      planMap.get(config.plan.toLowerCase()) ||
      planMap.get("starter") ||
      null;

    const gym = await Gym.create({
      name: config.name,
      ownerName: config.ownerName,
      ownerEmail: config.ownerEmail,
      location: config.location,
      phone: config.phone || "",
      website: config.website || "",
      description: config.description || "",
      status: "trial",
      plan: config.plan,
      joinedAt,
      trialEndsAt,
      subscriptionPlanId: matchedPlanId,
      revenueHistory: [],
    });

    // Create a matching owner user account
    const existingUser = await User.findOne({ email: config.ownerEmail }).lean();
    if (!existingUser) {
      const hashed = await hashPassword("FitnessHub@2025");
      await User.create({
        name: config.ownerName,
        email: config.ownerEmail,
        passwordHash: hashed,
        role: "owner",
        status: "active",
        gym: gym._id,
        mustChangePassword: true,
      });
    }

    console.log(
      `  Created: "${config.name}" — ${config.plan} plan — ${config.daysLeft} day(s) left`
    );
    created++;
  }

  console.log(`\nDone. Created ${created} trial gyms, skipped ${skipped}.`);
  console.log(
    "Run the main seed or restart the server to see them in the SuperAdmin dashboard."
  );
  process.exit(0);
}

seedTrials().catch((err) => {
  console.error(err);
  process.exit(1);
});
