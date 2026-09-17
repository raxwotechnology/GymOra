/**
 * seedAnuhasGym.js
 * Creates a fully populated "Anuhas Gym" with demo data for every page.
 * Idempotent — drops and recreates all Anuhas Gym data on each run.
 *
 * Run: node server/src/data/seedAnuhasGym.js
 *
 * Login credentials after seed:
 *   Owner   : owner@anuhasgym.lk   / gym123
 *   Coach 1 : ruwan@anuhasgym.lk   / gym123
 *   Coach 2 : shani@anuhasgym.lk   / gym123
 *   Coach 3 : pradeep@anuhasgym.lk / gym123
 *   Coach 4 : dilani@anuhasgym.lk  / gym123
 *   Member 1: kaveesha@anuhasgym.lk / gym123   (main demo member)
 *   Member * : firstname@anuhasgym.lk / gym123
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const mongoose = require("mongoose");

const Gym            = require("../models/Gym");
const User           = require("../models/User");
const Coach          = require("../models/Coach");
const Member         = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const WorkoutPlan    = require("../models/WorkoutPlan");
const MealPlan       = require("../models/MealPlan");
const Equipment      = require("../models/Equipment");
const Announcement   = require("../models/Announcement");
const Message        = require("../models/Message");
const Attendance     = require("../models/Attendance");
const Expense        = require("../models/Expense");
const Supplement     = require("../models/Supplement");
const Sale           = require("../models/Sale");
const SaleReturn     = require("../models/SaleReturn");
const CoachAttendance = require("../models/CoachAttendance");
const SalaryAdvance  = require("../models/SalaryAdvance");
const AuditLog       = require("../models/AuditLog");
const EmailLog       = require("../models/EmailLog");
const SmsLog         = require("../models/SmsLog");
const Payroll        = require("../models/Payroll");
const CoachLeave     = require("../models/CoachLeave");
const Supplier       = require("../models/Supplier");

const { hashPassword }              = require("../utils/password");
const { buildCoachCode, buildMemberCode } = require("../utils/entityCodes");

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n)      { const d = new Date(); d.setDate(d.getDate() - n);   return d; }
function daysFromNow(n)  { const d = new Date(); d.setDate(d.getDate() + n);   return d; }
function monthsAgo(n)    { const d = new Date(); d.setMonth(d.getMonth() - n); return d; }
function monthsFromNow(n){ const d = new Date(); d.setMonth(d.getMonth() + n); return d; }
function atHour(d, h, m = 0) { const x = new Date(d); x.setHours(h, m, 0, 0); return x; }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub"
  );
  console.log("Connected to MongoDB");

  // ── 1. Wipe existing Anuhas Gym data ──────────────────────────────────────
  const oldGym = await Gym.findOne({ name: "Anuhas Gym" });
  if (oldGym) {
    const gid = oldGym._id;
    await Promise.all([
      Member.deleteMany({ gym: gid }),
      Coach.deleteMany({ gym: gid }),
      MembershipPlan.deleteMany({ gym: gid }),
      WorkoutPlan.deleteMany({ gym: gid }),
      MealPlan.deleteMany({ gym: gid }),
      Equipment.deleteMany({ gym: gid }),
      Announcement.deleteMany({ gym: gid }),
      Message.deleteMany({ gym: gid }),
      Attendance.deleteMany({ gym: gid }),
      Expense.deleteMany({ gym: gid }),
      Supplement.deleteMany({ gym: gid }),
      Sale.deleteMany({ gym: gid }),
      SaleReturn.deleteMany({ gym: gid }),
      CoachAttendance.deleteMany({ gym: gid }),
      SalaryAdvance.deleteMany({ gym: gid }),
      AuditLog.deleteMany({ gym: gid }),
      EmailLog.deleteMany({ gymId: gid }),
      SmsLog.deleteMany({ gymId: gid }),
      Payroll.deleteMany({ gym: gid }),
      CoachLeave.deleteMany({ gym: gid }),
      Supplier.deleteMany({ gym: gid }),
    ]);
    const gymUsers = await User.find({ gym: gid });
    await User.deleteMany({ gym: gid });
    // also delete the owner user
    await User.deleteOne({ email: "owner@anuhasgym.lk" });
    console.log(`Wiped ${gymUsers.length + 1} users and all gym data for old Anuhas Gym`);
    await Gym.deleteOne({ _id: gid });
  }

  // ── 2. Gym ────────────────────────────────────────────────────────────────
  const gym = await Gym.create({
    name: "Anuhas Gym",
    ownerName: "Anuha Perera",
    ownerEmail: "owner@anuhasgym.lk",
    location: "Colombo 05, Sri Lanka",
    phone: "0112 345 678",
    website: "https://anuhasgym.lk",
    facebookUrl: "https://facebook.com/anuhasgym",
    googleMapsUrl: "https://maps.google.com/?q=Colombo",
    brNumber: "BR-2023-04521",
    description: "Anuhas Gym is a premium fitness centre in Colombo offering strength training, HIIT, yoga, and personal coaching for all fitness levels.",
    status: "active",
    plan: "Pro",
    joinedAt: monthsAgo(14),
    subscriptionStartedAt: monthsAgo(14),
    subscriptionEndsAt: monthsFromNow(10),
    revenueHistory: [
      { month: "Nov", value: 185000 },
      { month: "Dec", value: 192000 },
      { month: "Jan", value: 204000 },
      { month: "Feb", value: 218000 },
      { month: "Mar", value: 231000 },
      { month: "Apr", value: 247000 }
    ]
  });
  console.log(`Created gym: ${gym.name}`);

  // ── 3. Owner user ─────────────────────────────────────────────────────────
  const ownerUser = await User.create({
    name: "Anuha Perera",
    email: "owner@anuhasgym.lk",
    passwordHash: hashPassword("gym123"),
    role: "owner",
    status: "active",
    phone: "0771 234 567",
    bio: "Founder and head coach of Anuhas Gym. 10+ years in fitness industry.",
    title: "Gym Owner",
    gender: "male",
    dateOfBirth: new Date("1985-06-15"),
    address: "45, Flower Road, Colombo 07",
    city: "Colombo",
    country: "Sri Lanka",
    website: "https://anuhasgym.lk",
    emergencyContactName: "Dilini Perera",
    emergencyContactPhone: "0771 700 001",
    gym: gym._id,
    lastLoginAt: daysAgo(1),
    readNotificationIds: []
  });
  await Gym.findByIdAndUpdate(gym._id, { ownerEmail: ownerUser.email, ownerName: ownerUser.name });

  // ── 4. Membership plans ───────────────────────────────────────────────────
  await MembershipPlan.insertMany([
    { gym: gym._id, name: "1 Month",   durationMonths: 1,  price: 12000,  features: ["Gym access", "1 coach session/mo", "App access"], color: "#4a8cff" },
    { gym: gym._id, name: "3 Months",  durationMonths: 3,  price: 32000,  features: ["Gym access", "4 coach sessions/mo", "Meal plan", "App access"], color: "#00c9a7" },
    { gym: gym._id, name: "6 Months",  durationMonths: 6,  price: 58000,  features: ["Gym access", "Unlimited coaching", "Meal plan", "Body analysis", "App access"], color: "#7c3aed" },
    { gym: gym._id, name: "12 Months", durationMonths: 12, price: 108000, features: ["Unlimited access", "Unlimited coaching", "Custom meal plan", "Priority booking", "App access"], color: "#f7a64a" }
  ]);

  // ── 5. Workout Plans ──────────────────────────────────────────────────────
  const wpDocs = await WorkoutPlan.insertMany([
    {
      gym: gym._id, name: "Alpha Strength Program", level: "Intermediate", duration: "12 weeks",
      days: 4, category: "Strength", description: "Progressive overload strength program focused on compound lifts.",
      exercises: [
        { day: "Day 1 – Pull",   name: "Deadlift",             sets: 4, reps: "4-6",   rest: "3 min",  notes: "Neutral spine" },
        { day: "Day 1 – Pull",   name: "Barbell Row",          sets: 4, reps: "6-8",   rest: "2 min",  notes: "" },
        { day: "Day 1 – Pull",   name: "Lat Pulldown",         sets: 3, reps: "10-12", rest: "90 sec", notes: "" },
        { day: "Day 1 – Pull",   name: "Dumbbell Curl",        sets: 3, reps: "12-15", rest: "60 sec", notes: "" },
        { day: "Day 2 – Push",   name: "Barbell Bench Press",  sets: 4, reps: "6-8",   rest: "2 min",  notes: "" },
        { day: "Day 2 – Push",   name: "Incline DB Press",     sets: 3, reps: "10-12", rest: "90 sec", notes: "" },
        { day: "Day 2 – Push",   name: "Overhead Press",       sets: 4, reps: "8-10",  rest: "90 sec", notes: "" },
        { day: "Day 2 – Push",   name: "Tricep Pushdown",      sets: 3, reps: "12-15", rest: "60 sec", notes: "" },
        { day: "Day 3 – Legs",   name: "Back Squat",           sets: 4, reps: "6-8",   rest: "3 min",  notes: "" },
        { day: "Day 3 – Legs",   name: "Romanian Deadlift",    sets: 3, reps: "10-12", rest: "90 sec", notes: "" },
        { day: "Day 3 – Legs",   name: "Leg Press",            sets: 3, reps: "12-15", rest: "90 sec", notes: "" },
        { day: "Day 3 – Legs",   name: "Calf Raises",          sets: 4, reps: "15-20", rest: "60 sec", notes: "" },
        { day: "Day 4 – Full",   name: "Power Clean",          sets: 4, reps: "4",     rest: "3 min",  notes: "Focus on form" },
        { day: "Day 4 – Full",   name: "Pull-ups",             sets: 3, reps: "AMRAP", rest: "2 min",  notes: "" },
        { day: "Day 4 – Full",   name: "Dips",                 sets: 3, reps: "AMRAP", rest: "2 min",  notes: "" }
      ]
    },
    {
      gym: gym._id, name: "HIIT Cardio Blast", level: "Beginner", duration: "8 weeks",
      days: 3, category: "Cardio", description: "High intensity interval training for fat loss and cardio fitness.",
      exercises: [
        { day: "Session A", name: "Jump Rope Warm-up",  sets: 1, reps: "5 min",  rest: "0",      notes: "" },
        { day: "Session A", name: "Burpees",            sets: 4, reps: "20 sec", rest: "10 sec", notes: "Tabata" },
        { day: "Session A", name: "Mountain Climbers",  sets: 4, reps: "20 sec", rest: "10 sec", notes: "Tabata" },
        { day: "Session A", name: "Box Jumps",          sets: 4, reps: "10",     rest: "30 sec", notes: "" },
        { day: "Session B", name: "Rowing Machine",     sets: 1, reps: "10 min", rest: "0",      notes: "Steady pace" },
        { day: "Session B", name: "Kettlebell Swings",  sets: 5, reps: "15",     rest: "45 sec", notes: "" },
        { day: "Session B", name: "Battle Ropes",       sets: 4, reps: "30 sec", rest: "30 sec", notes: "" },
        { day: "Session C", name: "Treadmill Sprint",   sets: 8, reps: "30 sec", rest: "30 sec", notes: "Max speed" },
        { day: "Session C", name: "Plank Hold",         sets: 4, reps: "45 sec", rest: "30 sec", notes: "" },
        { day: "Session C", name: "Lateral Jumps",      sets: 3, reps: "20",     rest: "45 sec", notes: "" }
      ]
    },
    {
      gym: gym._id, name: "Yoga & Mobility Flow", level: "Beginner", duration: "Ongoing",
      days: 3, category: "Flexibility", description: "Holistic program combining yoga postures, breathing, and mobility work.",
      exercises: [
        { day: "Flow A – Morning", name: "Sun Salutation A",   sets: 5, reps: "1 round", rest: "30 sec", notes: "" },
        { day: "Flow A – Morning", name: "Warrior I & II",     sets: 3, reps: "45 sec",  rest: "20 sec", notes: "Each side" },
        { day: "Flow A – Morning", name: "Pigeon Pose",        sets: 2, reps: "60 sec",  rest: "0",      notes: "Deep hip flexor" },
        { day: "Flow B – Evening", name: "Cat-Cow Stretch",    sets: 3, reps: "10",      rest: "0",      notes: "" },
        { day: "Flow B – Evening", name: "Thread the Needle",  sets: 2, reps: "45 sec",  rest: "0",      notes: "Each side" },
        { day: "Flow B – Evening", name: "Child's Pose",       sets: 3, reps: "60 sec",  rest: "0",      notes: "" },
        { day: "Flow C – Full",    name: "Downward Dog",       sets: 4, reps: "30 sec",  rest: "0",      notes: "" },
        { day: "Flow C – Full",    name: "Bridge Pose",        sets: 3, reps: "45 sec",  rest: "20 sec", notes: "" },
        { day: "Flow C – Full",    name: "Seated Forward Fold",sets: 3, reps: "60 sec",  rest: "0",      notes: "" }
      ]
    },
    {
      gym: gym._id, name: "Beginner Full Body", level: "Beginner", duration: "6 weeks",
      days: 3, category: "General Fitness", description: "3-day full body program for complete beginners.",
      exercises: [
        { day: "Day A", name: "Goblet Squat",     sets: 3, reps: "12", rest: "60 sec", notes: "" },
        { day: "Day A", name: "Push-ups",          sets: 3, reps: "10", rest: "60 sec", notes: "" },
        { day: "Day A", name: "Dumbbell Row",      sets: 3, reps: "12", rest: "60 sec", notes: "Each arm" },
        { day: "Day A", name: "Plank",             sets: 3, reps: "30 sec", rest: "45 sec", notes: "" },
        { day: "Day B", name: "Lunges",            sets: 3, reps: "10",    rest: "60 sec", notes: "Each leg" },
        { day: "Day B", name: "DB Shoulder Press", sets: 3, reps: "12",    rest: "60 sec", notes: "" },
        { day: "Day B", name: "Lat Pulldown",      sets: 3, reps: "12",    rest: "60 sec", notes: "" },
        { day: "Day B", name: "Bicycle Crunches",  sets: 3, reps: "20",    rest: "45 sec", notes: "" },
        { day: "Day C", name: "Leg Press",         sets: 3, reps: "15",    rest: "60 sec", notes: "" },
        { day: "Day C", name: "Chest Flyes",       sets: 3, reps: "12",    rest: "60 sec", notes: "" },
        { day: "Day C", name: "Face Pulls",        sets: 3, reps: "15",    rest: "60 sec", notes: "" },
        { day: "Day C", name: "Dead Bug",          sets: 3, reps: "10",    rest: "45 sec", notes: "Each side" }
      ]
    }
  ]);

  // ── 6. Meal Plans ─────────────────────────────────────────────────────────
  const mpDocs = await MealPlan.insertMany([
    {
      gym: gym._id, name: "Muscle Gain 3200kcal", calories: 3200, protein: 200, carbs: 350, fat: 95, goal: "Muscle Gain",
      meals: [
        { time: "7:00 AM",  name: "Breakfast",          foods: ["Oats 100g", "4 Eggs", "Banana", "Whole milk"], cals: 720, protein: 42, carbs: 88, fat: 22 },
        { time: "10:00 AM", name: "Mid-Morning Snack",  foods: ["Greek yogurt", "Mixed nuts", "Honey"], cals: 380, protein: 22, carbs: 32, fat: 18 },
        { time: "1:00 PM",  name: "Lunch",              foods: ["Brown rice 150g", "Chicken breast 200g", "Broccoli", "Olive oil"], cals: 780, protein: 55, carbs: 92, fat: 21 },
        { time: "4:00 PM",  name: "Pre-Workout",        foods: ["Banana", "Peanut butter", "Whole wheat bread"], cals: 460, protein: 18, carbs: 62, fat: 14 },
        { time: "7:00 PM",  name: "Post-Workout Dinner",foods: ["Sweet potato 200g", "Salmon fillet 180g", "Spinach salad"], cals: 610, protein: 48, carbs: 58, fat: 16 },
        { time: "9:30 PM",  name: "Evening Snack",      foods: ["Cottage cheese", "Berries", "Casein shake"], cals: 250, protein: 32, carbs: 18, fat: 4 }
      ]
    },
    {
      gym: gym._id, name: "Fat Loss 1800kcal", calories: 1800, protein: 150, carbs: 160, fat: 60, goal: "Weight Loss",
      meals: [
        { time: "7:30 AM",  name: "Breakfast",       foods: ["2 eggs scrambled", "Whole wheat toast", "Coffee"], cals: 340, protein: 24, carbs: 30, fat: 14 },
        { time: "12:00 PM", name: "Lunch",           foods: ["Tuna salad", "Cucumber", "Cherry tomatoes", "Lemon dressing"], cals: 420, protein: 40, carbs: 22, fat: 18 },
        { time: "3:30 PM",  name: "Afternoon Snack", foods: ["Apple", "Almonds 25g"], cals: 210, protein: 5, carbs: 28, fat: 9 },
        { time: "7:00 PM",  name: "Dinner",          foods: ["Grilled chicken 150g", "Zucchini noodles", "Tomato sauce"], cals: 480, protein: 45, carbs: 38, fat: 14 },
        { time: "9:00 PM",  name: "Evening",         foods: ["Protein shake", "Low-fat milk"], cals: 200, protein: 28, carbs: 14, fat: 3 }
      ]
    },
    {
      gym: gym._id, name: "Performance Fuel 2800kcal", calories: 2800, protein: 175, carbs: 310, fat: 85, goal: "Athletic Performance",
      meals: [
        { time: "6:30 AM",  name: "Early Breakfast",   foods: ["Overnight oats", "Whey protein", "Blueberries"], cals: 580, protein: 40, carbs: 72, fat: 12 },
        { time: "10:00 AM", name: "Mid-Morning",       foods: ["Rice cakes", "Tuna", "Avocado"], cals: 440, protein: 32, carbs: 48, fat: 16 },
        { time: "1:00 PM",  name: "Lunch",             foods: ["Pasta 130g", "Beef mince 150g", "Tomato sauce"], cals: 720, protein: 48, carbs: 82, fat: 22 },
        { time: "4:30 PM",  name: "Pre-Training",      foods: ["Banana", "Espresso", "Date balls"], cals: 320, protein: 6, carbs: 68, fat: 4 },
        { time: "7:30 PM",  name: "Recovery Dinner",   foods: ["Salmon 200g", "Quinoa 120g", "Green beans"], cals: 620, protein: 52, carbs: 54, fat: 22 },
        { time: "10:00 PM", name: "Night Protein",     foods: ["Casein shake", "Peanut butter"], cals: 280, protein: 30, carbs: 12, fat: 12 }
      ]
    },
    {
      gym: gym._id, name: "Maintenance 2400kcal", calories: 2400, protein: 140, carbs: 270, fat: 80, goal: "Maintenance",
      meals: [
        { time: "8:00 AM",  name: "Breakfast",       foods: ["Egg omelette", "Whole wheat toast", "Orange juice"], cals: 520, protein: 32, carbs: 54, fat: 20 },
        { time: "11:00 AM", name: "Snack",           foods: ["Mixed fruit bowl", "Yogurt"], cals: 280, protein: 10, carbs: 50, fat: 5 },
        { time: "1:30 PM",  name: "Lunch",           foods: ["Grilled fish 150g", "Rice 120g", "Mixed vegetables"], cals: 620, protein: 42, carbs: 72, fat: 16 },
        { time: "4:30 PM",  name: "Afternoon Snack", foods: ["Hummus", "Carrot sticks", "Pita bread"], cals: 320, protein: 12, carbs: 44, fat: 12 },
        { time: "7:30 PM",  name: "Dinner",          foods: ["Chicken curry", "Basmati rice", "Raita"], cals: 660, protein: 44, carbs: 72, fat: 18 }
      ]
    }
  ]);

  // ── 7. Coach users + profiles ─────────────────────────────────────────────
  const coachDefs = [
    {
      name: "Ruwan Bandara", email: "ruwan@anuhasgym.lk", specialty: "Strength & Powerlifting",
      gender: "male", dob: "1988-03-20", phone: "0771 111 001",
      address: "14/A, Perera Mawatha, Boralesgamuwa", city: "Boralesgamuwa", country: "Sri Lanka",
      baseSalary: 95000,
      certifications: "NSCA-CPT | Powerlifting Coaching Certificate | FMS Level 2",
      certExpiryDates: ["2027-09-30", "2028-06-15"],
      documents: ["NSCA Certificate", "NIC Copy", "First Aid Certificate"],
      emergencyContactName: "Chamari Bandara", emergencyContactPhone: "0771 900 001"
    },
    {
      name: "Shani Wickrama", email: "shani@anuhasgym.lk", specialty: "HIIT & Cardio",
      gender: "female", dob: "1993-07-14", phone: "0772 222 002",
      address: "22, Temple Lane, Nugegoda", city: "Nugegoda", country: "Sri Lanka",
      baseSalary: 85000,
      certifications: "NASM-CPT | TRX Certified Trainer | CrossFit Level 1",
      certExpiryDates: ["2027-12-31", "2027-08-20"],
      documents: ["NASM Certificate", "NIC Copy", "Medical Clearance"],
      emergencyContactName: "Roshan Wickrama", emergencyContactPhone: "0772 900 002"
    },
    {
      name: "Pradeep Kumara", email: "pradeep@anuhasgym.lk", specialty: "Yoga & Mobility",
      gender: "male", dob: "1990-11-05", phone: "0773 333 003",
      address: "5, Lake Road, Maharagama", city: "Maharagama", country: "Sri Lanka",
      baseSalary: 65000,
      certifications: "RYT-200 Yoga Alliance | Corrective Exercise Specialist | FRC Mobility Coach",
      certExpiryDates: ["2028-03-15", "2026-11-30"],
      documents: ["Yoga Alliance Certificate", "NIC Copy", "First Aid Certificate"],
      emergencyContactName: "Nirosha Kumara", emergencyContactPhone: "0773 900 003"
    },
    {
      name: "Dilani Madushani", email: "dilani@anuhasgym.lk", specialty: "Nutrition & Wellness",
      gender: "female", dob: "1995-02-28", phone: "0774 444 004",
      address: "31, Flower Road, Dehiwala", city: "Dehiwala", country: "Sri Lanka",
      baseSalary: 60000,
      certifications: "ISSA Certified Nutritionist | Precision Nutrition Level 1 | Wellness Coaching Certificate",
      certExpiryDates: ["2027-06-30", "2028-01-15"],
      documents: ["ISSA Certificate", "NIC Copy", "Health & Safety Certificate"],
      emergencyContactName: "Sampath Madushani", emergencyContactPhone: "0774 900 004"
    }
  ];

  const coachUserMap = new Map();
  const coachDocMap  = new Map();

  for (const [i, cd] of coachDefs.entries()) {
    const cu = await User.create({
      name: cd.name, email: cd.email,
      passwordHash: hashPassword("gym123"),
      role: "coach", status: "active",
      phone: cd.phone, bio: `${cd.specialty} coach at Anuhas Gym with ${6 + i} years experience.`,
      title: "Senior Fitness Coach", gender: cd.gender, dateOfBirth: new Date(cd.dob),
      address: cd.address, city: cd.city, country: cd.country,
      emergencyContactName: cd.emergencyContactName, emergencyContactPhone: cd.emergencyContactPhone,
      gym: gym._id, lastLoginAt: daysAgo(i + 1), readNotificationIds: []
    });
    coachUserMap.set(cd.email, cu);

    const coachDoc = new Coach({
      gym: gym._id, user: cu._id,
      name: cd.name, specialty: cd.specialty,
      email: cd.email, phone: cd.phone,
      status: "active", members: 8 + i * 3,
      joinedAt: monthsAgo(12 - i * 2),
      gender: cd.gender, dateOfBirth: new Date(cd.dob),
      address: `${10 + i} Gym Lane, Colombo`,
      nationalId: `${198800000 + i * 11111}V`,
      employeeCode: `EMP-00${i + 1}`,
      hireDate: monthsAgo(12 - i * 2),
      employmentType: i < 2 ? "full-time" : "part-time",
      salaryModel: i < 2 ? "fixed" : "commission",
      baseSalary: cd.baseSalary,
      shiftSchedule: i % 2 === 0 ? "Morning (6am–2pm)" : "Evening (2pm–10pm)",
      specializations: [cd.specialty, "Functional Training"],
      yearsOfExperience: 6 + i,
      languages: ["Sinhala", "English"],
      certifications: cd.certifications,
      certificationExpiryDates: cd.certExpiryDates,
      availableHours: i < 2 ? "Mon–Sat | 6:00 AM – 2:00 PM" : "Mon–Fri | 2:00 PM – 9:00 PM",
      maxClientCapacity: 20 + i * 2,
      performanceNotes: `Excellent track record with client transformations. ${i % 2 === 0 ? "Top performer Q1." : "Consistent results."}`,
      bankPaymentDetails: `Commercial Bank | A/C: 100${2000 + i} | Anuhas Gym Payroll`,
      emergencyContact: `${cd.emergencyContactName} – ${cd.emergencyContactPhone}`,
      documents: cd.documents,
      avatar: cd.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    });
    coachDoc.coachCode = buildCoachCode(coachDoc._id);
    await coachDoc.save();
    await User.findByIdAndUpdate(cu._id, { coachProfile: coachDoc._id });
    coachDocMap.set(cd.email, coachDoc);
  }

  const coaches = [...coachDocMap.values()];
  console.log(`Created ${coaches.length} coaches`);

  // ── 8. Members ────────────────────────────────────────────────────────────
  const memberDefs = [
    {
      name: "Kaveesha Perera",    email: "kaveesha@anuhasgym.lk",  coach: "Ruwan Bandara",    plan: "12 Months", months: 12, paid: 108000, due: 108000, payStatus: "paid",    status: "active",   joined: monthsAgo(11), goal: "Muscle Gain",         progress: 78, checkIns: 132, dob: "1997-04-10", gender: "female", phone: "0776 100 001",
      wp: wpDocs[0], mp: mpDocs[0], heightCm: 162, weightKg: 58, targetKg: 62, bodyFat: 19, bench: 45
    },
    {
      name: "Dinesh Alwis",       email: "dinesh@anuhasgym.lk",    coach: "Ruwan Bandara",    plan: "3 Months",  months: 3,  paid: 32000,  due: 32000,  payStatus: "paid",    status: "active",   joined: monthsAgo(8),  goal: "Strength",            progress: 62, checkIns: 68,  dob: "1990-09-22", gender: "male",   phone: "0776 100 002",
      wp: wpDocs[0], mp: mpDocs[2], heightCm: 178, weightKg: 84, targetKg: 88, bodyFat: 16, bench: 85
    },
    {
      name: "Hiruni Jayasekara",  email: "hiruni@anuhasgym.lk",    coach: "Shani Wickrama",   plan: "1 Month",   months: 1,  paid: 12000,  due: 12000,  payStatus: "paid",    status: "active",   joined: monthsAgo(3),  goal: "Weight Loss",         progress: 35, checkIns: 22,  dob: "1999-12-05", gender: "female", phone: "0776 100 003",
      wp: wpDocs[1], mp: mpDocs[1], heightCm: 158, weightKg: 68, targetKg: 58, bodyFat: 28, bench: 30
    },
    {
      name: "Chamara Rathnayake", email: "chamara@anuhasgym.lk",   coach: "Shani Wickrama",   plan: "6 Months",  months: 6,  paid: 58000,  due: 58000,  payStatus: "paid",    status: "active",   joined: monthsAgo(5),  goal: "Athletic Performance",progress: 55, checkIns: 48,  dob: "1994-07-18", gender: "male",   phone: "0776 100 004",
      wp: wpDocs[1], mp: mpDocs[2], heightCm: 175, weightKg: 78, targetKg: 76, bodyFat: 14, bench: 75
    },
    {
      name: "Sanduni Weerasinghe",email: "sanduni@anuhasgym.lk",   coach: "Pradeep Kumara",   plan: "3 Months",  months: 3,  paid: 32000,  due: 32000,  payStatus: "paid",    status: "active",   joined: monthsAgo(6),  goal: "Flexibility",         progress: 48, checkIns: 52,  dob: "2000-03-30", gender: "female", phone: "0776 100 005",
      wp: wpDocs[2], mp: mpDocs[3], heightCm: 160, weightKg: 55, targetKg: 54, bodyFat: 22, bench: 25
    },
    {
      name: "Kasun Madushan",     email: "kasun@anuhasgym.lk",     coach: "Pradeep Kumara",   plan: "12 Months", months: 12, paid: 54000,  due: 108000, payStatus: "partial", status: "active",   joined: monthsAgo(10), goal: "Muscle Gain",         progress: 70, checkIns: 98,  dob: "1992-01-25", gender: "male",   phone: "0776 100 006",
      wp: wpDocs[0], mp: mpDocs[0], heightCm: 172, weightKg: 76, targetKg: 82, bodyFat: 17, bench: 80
    },
    {
      name: "Thilini Gunawardena",email: "thilini@anuhasgym.lk",   coach: "Dilani Madushani", plan: "1 Month",   months: 1,  paid: 0,      due: 12000,  payStatus: "unpaid",  status: "inactive", joined: monthsAgo(2),  goal: "Wellness",            progress: 12, checkIns: 4,   dob: "1998-08-14", gender: "female", phone: "0776 100 007",
      wp: wpDocs[3], mp: mpDocs[3], heightCm: 155, weightKg: 62, targetKg: 58, bodyFat: 26, bench: 20
    },
    {
      name: "Nuwan Dissanayake",  email: "nuwan@anuhasgym.lk",     coach: "Ruwan Bandara",    plan: "6 Months",  months: 6,  paid: 58000,  due: 58000,  payStatus: "paid",    status: "active",   joined: monthsAgo(7),  goal: "Powerlifting",        progress: 82, checkIns: 88,  dob: "1988-11-11", gender: "male",   phone: "0776 100 008",
      wp: wpDocs[0], mp: mpDocs[2], heightCm: 180, weightKg: 92, targetKg: 95, bodyFat: 15, bench: 110
    },
    {
      name: "Amaya Rodrigo",      email: "amaya@anuhasgym.lk",     coach: "Shani Wickrama",   plan: "3 Months",  months: 3,  paid: 16000,  due: 32000,  payStatus: "partial", status: "active",   joined: monthsAgo(4),  goal: "Weight Loss",         progress: 44, checkIns: 38,  dob: "2001-05-22", gender: "female", phone: "0776 100 009",
      wp: wpDocs[1], mp: mpDocs[1], heightCm: 163, weightKg: 72, targetKg: 62, bodyFat: 30, bench: 28
    },
    {
      name: "Isuru Niroshan",     email: "isuru@anuhasgym.lk",     coach: "Dilani Madushani", plan: "12 Months", months: 12, paid: 108000, due: 108000, payStatus: "paid",    status: "active",   joined: monthsAgo(13), goal: "General Fitness",     progress: 91, checkIns: 168, dob: "1986-06-08", gender: "male",   phone: "0776 100 010",
      wp: wpDocs[3], mp: mpDocs[3], heightCm: 170, weightKg: 73, targetKg: 72, bodyFat: 16, bench: 65
    },
    {
      name: "Sachini Kumari",     email: "sachini@anuhasgym.lk",   coach: "Pradeep Kumara",   plan: "3 Months",  months: 3,  paid: 32000,  due: 32000,  payStatus: "paid",    status: "active",   joined: monthsAgo(5),  goal: "Flexibility",         progress: 60, checkIns: 45,  dob: "1996-10-17", gender: "female", phone: "0776 100 011",
      wp: wpDocs[2], mp: mpDocs[3], heightCm: 157, weightKg: 52, targetKg: 50, bodyFat: 21, bench: 22
    },
    {
      name: "Gayan Perera",       email: "gayan@anuhasgym.lk",     coach: "Dilani Madushani", plan: "1 Month",   months: 1,  paid: 12000,  due: 12000,  payStatus: "paid",    status: "active",   joined: monthsAgo(1),  goal: "Muscle Gain",         progress: 18, checkIns: 12,  dob: "1993-04-03", gender: "male",   phone: "0776 100 012",
      wp: wpDocs[3], mp: mpDocs[0], heightCm: 174, weightKg: 70, targetKg: 76, bodyFat: 18, bench: 60
    }
  ];

  const memberUserMap = new Map();
  const memberDocList = [];

  for (const [i, md] of memberDefs.entries()) {
    const memberAddresses = [
      { address: "12, Rose Avenue, Colombo 05",       city: "Colombo" },
      { address: "8, Park Lane, Narahenpita",          city: "Narahenpita" },
      { address: "45, Station Road, Nugegoda",         city: "Nugegoda" },
      { address: "27, Hill Street, Dehiwala",          city: "Dehiwala" },
      { address: "3, Temple Lane, Maharagama",         city: "Maharagama" },
      { address: "61, Marine Drive, Boralesgamuwa",    city: "Boralesgamuwa" },
      { address: "19, College Lane, Piliyandala",      city: "Piliyandala" },
      { address: "88, Gamage Place, Homagama",         city: "Homagama" },
      { address: "14, Junction Road, Kaduwela",        city: "Kaduwela" },
      { address: "36, Flower Road, Colombo 07",        city: "Colombo" },
      { address: "5, Lake View, Battaramulla",         city: "Battaramulla" },
      { address: "22, Palm Grove, Rajagiriya",         city: "Rajagiriya" }
    ];
    const memberEmergencyContacts = [
      { name: "Saman Perera",      phone: "0771 801 001" },
      { name: "Nilmini Alwis",     phone: "0772 801 002" },
      { name: "Rohan Jayasekara",  phone: "0773 801 003" },
      { name: "Kumari Rathnayake", phone: "0774 801 004" },
      { name: "Dilan Weerasinghe", phone: "0775 801 005" },
      { name: "Nimali Madushan",   phone: "0776 801 006" },
      { name: "Asanka Gunawardena",phone: "0777 801 007" },
      { name: "Tharaka Dissanayake",phone:"0778 801 008" },
      { name: "Kasun Rodrigo",     phone: "0779 801 009" },
      { name: "Dilki Niroshan",    phone: "0771 801 010" },
      { name: "Suresh Kumari",     phone: "0772 801 011" },
      { name: "Thilina Perera",    phone: "0773 801 012" }
    ];
    const mAddr = memberAddresses[i % memberAddresses.length];
    const mEmg  = memberEmergencyContacts[i % memberEmergencyContacts.length];

    const mu = await User.create({
      name: md.name, email: md.email,
      passwordHash: hashPassword("gym123"),
      role: "member", status: "active",
      phone: md.phone, bio: `Member at Anuhas Gym since ${md.joined.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.`,
      title: "Active Member", gender: md.gender, dateOfBirth: new Date(md.dob),
      address: mAddr.address, city: mAddr.city, country: "Sri Lanka",
      emergencyContactName: mEmg.name, emergencyContactPhone: mEmg.phone,
      gym: gym._id, lastLoginAt: daysAgo(i % 4), readNotificationIds: []
    });
    memberUserMap.set(md.email, mu);

    const planStart  = md.joined;
    const planExpiry = new Date(planStart);
    planExpiry.setMonth(planExpiry.getMonth() + md.months);

    // build workout history (last 3 sessions)
    const histEntries = [2, 5, 9].map((daysBack) => ({
      date: daysAgo(daysBack),
      planName: md.wp.name,
      day: md.wp.exercises[0]?.day || "Day 1",
      exercises: md.wp.exercises
        .filter((e) => e.day === (md.wp.exercises[0]?.day || "Day 1"))
        .map((e) => ({ ...e._doc || e, done: Math.random() > 0.25, loggedWeight: `${randInt(20, 80)} kg`, completionNotes: "" }))
    }));

    const memberDoc = new Member({
      gym: gym._id, user: mu._id,
      name: md.name, coach: md.coach,
      plan: md.plan, subscriptionDurationMonths: md.months,
      status: md.status, joinedAt: md.joined,
      planStartedAt: planStart, planExpiresAt: planExpiry,
      checkIns: md.checkIns, goal: md.goal,
      email: md.email, phone: md.phone,
      gender: md.gender, dateOfBirth: new Date(md.dob),
      heightCm: md.heightCm, currentWeightKg: md.weightKg, targetWeightKg: md.targetKg,
      targetBodyFat: md.bodyFat - 4, bodyFatPercentage: md.bodyFat,
      bmi: parseFloat((md.weightKg / ((md.heightCm / 100) ** 2)).toFixed(1)),
      fitnessLevel: ["beginner","intermediate","intermediate","advanced"][i % 4],
      preferredWorkoutTime: ["Morning","Evening","Morning","Afternoon"][i % 4],
      medicalNotes: i === 0 ? "No known conditions." : "",
      emergencyContact: `071 ${800 + i} 1234`,
      emergencyContactRelationship: pick(["Spouse","Parent","Sibling","Friend"]),
      address: `${10 + i * 3} Galle Road, Colombo`,
      attendanceNotes: md.checkIns > 50 ? "Consistent attendee." : "",
      assignedLocker: `L-${10 + i}`,
      memberTag: pick(["VIP","Regular","New Joiner","Trial"]),
      barcode: `AGY${String(1000 + i).padStart(6, "0")}`,
      paymentStatus: md.payStatus, amountPaid: md.paid, amountDue: md.due,
      paymentMethod: pick(["cash","card","bank-transfer"]),
      dietPlanName: md.mp.name,
      personalNotes: i === 0 ? "Highly motivated. Competition prep planned for Q4." : "",
      supplementUsage: pick(["Whey protein daily", "Creatine + Pre-workout", "BCAAs", "None"]),
      membershipFreezeStatus: "",
      goalTargetDate: monthsFromNow(4 - (i % 4)),
      joinSource: pick(["referral","walk-in","social-media","website"]),
      renewalReminderPreference: pick(["email","sms","both"]),
      bodyMeasurements: { chestCm: 88 + i, waistCm: 76 + i, armsCm: 32 + i, thighsCm: 52 + i },
      progress: md.progress,
      avatar: md.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      myStats: {
        weight:    [md.weightKg - 2, md.weightKg - 1.5, md.weightKg - 1, md.weightKg - 0.5, md.weightKg, md.weightKg + 0.5],
        bodyFat:   [md.bodyFat + 2, md.bodyFat + 1.5, md.bodyFat + 1, md.bodyFat + 0.5, md.bodyFat, md.bodyFat - 0.5],
        labels:    ["Nov","Dec","Jan","Feb","Mar","Apr"],
        benchPress:[md.bench - 10, md.bench - 7, md.bench - 4, md.bench - 2, md.bench, md.bench + 2],
        checkInsThisMonth: Math.max(4, Math.round(md.checkIns / 8)),
        streak: randInt(2, 8),
        totalCheckIns: md.checkIns
      },
      myWorkoutPlan: {
        name: md.wp.name, week: randInt(2, 8), totalWeeks: 12,
        today: {
          day: md.wp.exercises[0]?.day || "Day 1",
          exercises: md.wp.exercises
            .filter((e) => e.day === (md.wp.exercises[0]?.day || "Day 1"))
            .map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, done: i === 0 && Math.random() > 0.4, loggedWeight: "", completionNotes: "" }))
        }
      },
      myMealPlan: { name: md.mp.name, meals: md.mp.meals },
      workoutHistory: histEntries,
      paymentHistory: [
        { date: md.joined, amount: md.paid > 0 ? Math.round(md.paid / 2) : 0, method: "cash", planName: md.plan, months: md.months, note: "Initial payment" },
        ...(md.paid > 0 && md.months > 1 ? [{ date: daysAgo(randInt(10, 40)), amount: md.paid - Math.round(md.paid / 2), method: "card", planName: md.plan, months: md.months, note: "Balance cleared" }] : [])
      ]
    });
    memberDoc.memberCode = buildMemberCode(memberDoc._id);
    await memberDoc.save();
    await User.findByIdAndUpdate(mu._id, { memberProfile: memberDoc._id });
    memberDocList.push({ doc: memberDoc, def: md });
  }
  console.log(`Created ${memberDocList.length} members`);

  // ── 9. Equipment ──────────────────────────────────────────────────────────
  await Equipment.insertMany([
    { gym: gym._id, name: "Olympic Barbell Set (7)",     qty: 7,  status: "good",        lastService: daysAgo(45),  nextServiceDate: daysFromNow(45),  purchaseDate: monthsAgo(18), purchasePrice: 185000, vendor: "FitGear Lanka",   serialNumber: "OBR-2023-001", location: "Free Weights Area",  warrantyExpiresAt: daysFromNow(180), serviceHistory: [{ date: daysAgo(45), type: "service", description: "Knurling clean, collar check", cost: 2500, technician: "Amal T." }], breakageHistory: [] },
    { gym: gym._id, name: "Smith Machine",               qty: 1,  status: "good",        lastService: daysAgo(30),  nextServiceDate: daysFromNow(60),  purchaseDate: monthsAgo(20), purchasePrice: 320000, vendor: "GymPro Imports",  serialNumber: "SM-2022-014",  location: "Strength Floor",     warrantyExpiresAt: daysFromNow(365), serviceHistory: [{ date: daysAgo(30), type: "inspection", description: "Cable & pulley check", cost: 3000, technician: "Nimal P." }], breakageHistory: [] },
    { gym: gym._id, name: "Treadmill (Commercial)",      qty: 4,  status: "good",        lastService: daysAgo(20),  nextServiceDate: daysFromNow(70),  purchaseDate: monthsAgo(12), purchasePrice: 220000, vendor: "TechFit LK",     serialNumber: "TM-2024-C04",  location: "Cardio Zone",        warrantyExpiresAt: daysFromNow(365), serviceHistory: [{ date: daysAgo(20), type: "service", description: "Belt lubrication, motor check", cost: 5000, technician: "Service Team" }], breakageHistory: [] },
    { gym: gym._id, name: "Rowing Machine",              qty: 2,  status: "maintenance", lastService: daysAgo(95),  nextServiceDate: daysAgo(5),       purchaseDate: monthsAgo(24), purchasePrice: 145000, vendor: "FitGear Lanka",   serialNumber: "RM-2022-007",  location: "Cardio Zone",        warrantyExpiresAt: daysAgo(180),     serviceHistory: [], breakageHistory: [{ reportedAt: daysAgo(10), description: "Monitor display flickering", reportedBy: "Ruwan Bandara", resolvedAt: null, resolutionNotes: "" }] },
    { gym: gym._id, name: "Cable Crossover Machine",     qty: 2,  status: "good",        lastService: daysAgo(15),  nextServiceDate: daysFromNow(75),  purchaseDate: monthsAgo(15), purchasePrice: 280000, vendor: "GymPro Imports",  serialNumber: "CC-2023-002",  location: "Strength Floor",     warrantyExpiresAt: daysFromNow(275), serviceHistory: [{ date: daysAgo(15), type: "service", description: "Cable replacement on unit #1", cost: 7500, technician: "Nimal P." }], breakageHistory: [] },
    { gym: gym._id, name: "Dumbbell Rack (2.5–50kg)",    qty: 2,  status: "good",        lastService: daysAgo(60),  nextServiceDate: daysFromNow(30),  purchaseDate: monthsAgo(18), purchasePrice: 240000, vendor: "FitGear Lanka",   serialNumber: "DR-2023-SET",  location: "Free Weights Area",  warrantyExpiresAt: daysFromNow(360), serviceHistory: [], breakageHistory: [] },
    { gym: gym._id, name: "Leg Press Machine",           qty: 1,  status: "good",        lastService: daysAgo(40),  nextServiceDate: daysFromNow(50),  purchaseDate: monthsAgo(16), purchasePrice: 190000, vendor: "IronBody Equip", serialNumber: "LP-2023-018",  location: "Legs Area",          warrantyExpiresAt: daysFromNow(220), serviceHistory: [{ date: daysAgo(40), type: "service", description: "Sled track lubrication", cost: 1800, technician: "Amal T." }], breakageHistory: [] },
    { gym: gym._id, name: "Yoga Mat Station",            qty: 20, status: "good",        lastService: daysAgo(10),  nextServiceDate: daysFromNow(80),  purchaseDate: monthsAgo(8),  purchasePrice: 45000,  vendor: "YogaLife LK",    serialNumber: "YM-2024-SET",  location: "Studio Room",        warrantyExpiresAt: daysFromNow(540), serviceHistory: [], breakageHistory: [] },
    { gym: gym._id, name: "Battle Ropes",                qty: 3,  status: "good",        lastService: daysAgo(55),  nextServiceDate: daysFromNow(35),  purchaseDate: monthsAgo(10), purchasePrice: 18000,  vendor: "FitGear Lanka",   serialNumber: "BR-2024-003",  location: "Functional Zone",    warrantyExpiresAt: daysFromNow(300), serviceHistory: [], breakageHistory: [] },
    { gym: gym._id, name: "Pull-up & Dip Station",       qty: 2,  status: "replace",     lastService: daysAgo(100), nextServiceDate: daysAgo(10),      purchaseDate: monthsAgo(30), purchasePrice: 62000,  vendor: "IronBody Equip", serialNumber: "PD-2022-002",  location: "Functional Zone",    warrantyExpiresAt: daysAgo(365),     serviceHistory: [], breakageHistory: [{ reportedAt: daysAgo(12), description: "Bolt shear on dip bar — unsafe for use", reportedBy: "Pradeep Kumara", resolvedAt: null, resolutionNotes: "" }] }
  ]);

  // ── 10. Supplements ───────────────────────────────────────────────────────
  const supplements = await Supplement.insertMany([
    { gym: gym._id, name: "ON Gold Standard Whey 2.27kg", sku: "WH-ON-2KG",   brand: "Optimum Nutrition", category: "Protein",       stockQty: 24, unitPrice: 18500, buyingPrice: 14000, reorderLevel: 5,  status: "in-stock",   supplierName: "NutriFit Imports", sqn: "SQ-2024-001", grn: "GRN-001" },
    { gym: gym._id, name: "MuscleTech Creatine 400g",      sku: "CR-MT-400",   brand: "MuscleTech",        category: "Creatine",      stockQty: 18, unitPrice: 7800,  buyingPrice: 5500,  reorderLevel: 4,  status: "in-stock",   supplierName: "NutriFit Imports", sqn: "SQ-2024-002", grn: "GRN-002" },
    { gym: gym._id, name: "C4 Pre-Workout 60 serves",      sku: "PW-C4-60",    brand: "Cellucor",          category: "Pre-Workout",   stockQty: 3,  unitPrice: 9200,  buyingPrice: 6800,  reorderLevel: 4,  status: "low-stock",  supplierName: "SportSupply LK",   sqn: "SQ-2024-003", grn: "GRN-003" },
    { gym: gym._id, name: "Scitec BCAA 300g",              sku: "BC-SC-300",   brand: "Scitec Nutrition",  category: "BCAA / Amino Acids", stockQty: 10, unitPrice: 5400, buyingPrice: 3800, reorderLevel: 3, status: "in-stock",   supplierName: "SportSupply LK",   sqn: "SQ-2024-004", grn: "GRN-004" },
    { gym: gym._id, name: "MyProtein Weight Gainer 2.5kg", sku: "WG-MP-25K",   brand: "MyProtein",         category: "Weight Gainer", stockQty: 8,  unitPrice: 16200, buyingPrice: 12000, reorderLevel: 3,  status: "in-stock",   supplierName: "NutriFit Imports", sqn: "SQ-2024-005", grn: "GRN-005" },
    { gym: gym._id, name: "Omega-3 Fish Oil 200 caps",     sku: "OM-FO-200",   brand: "Natrol",            category: "Omega / Fish Oil",  stockQty: 0,  unitPrice: 3200, buyingPrice: 2100,  reorderLevel: 5,  status: "out-of-stock", supplierName: "HealthFirst LK",  sqn: "SQ-2024-006", grn: "GRN-006" },
    { gym: gym._id, name: "PhD Nutrition Protein Bar x12", sku: "PB-PhD-12",   brand: "PhD Nutrition",     category: "Snack / Bar",   stockQty: 22, unitPrice: 2800,  buyingPrice: 1900,  reorderLevel: 6,  status: "in-stock",   supplierName: "SportSupply LK",   sqn: "SQ-2024-007", grn: "GRN-007" },
    { gym: gym._id, name: "Magnesium Glycinate 120 caps",  sku: "MG-GLY-120",  brand: "NOW Foods",         category: "Minerals",      stockQty: 14, unitPrice: 4200,  buyingPrice: 2900,  reorderLevel: 4,  status: "in-stock",   supplierName: "HealthFirst LK",   sqn: "SQ-2024-008", grn: "GRN-008" }
  ]);

  // ── 11. Sales ─────────────────────────────────────────────────────────────
  const salesData = [
    { days: 2,  customer: "Kaveesha Perera", sku: "WH-ON-2KG", qty: 1, method: "card",   member: "Kaveesha Perera" },
    { days: 5,  customer: "Walk-in",         sku: "CR-MT-400",  qty: 2, method: "cash",   member: "" },
    { days: 8,  customer: "Dinesh Alwis",    sku: "PW-C4-60",   qty: 1, method: "card",   member: "Dinesh Alwis" },
    { days: 11, customer: "Nuwan Dissanayake",sku: "WH-ON-2KG", qty: 2, method: "card",   member: "Nuwan Dissanayake" },
    { days: 15, customer: "Walk-in",         sku: "BC-SC-300",  qty: 1, method: "cash",   member: "" },
    { days: 18, customer: "Isuru Niroshan",  sku: "PB-PhD-12",  qty: 3, method: "cash",   member: "Isuru Niroshan" },
    { days: 22, customer: "Kasun Madushan",  sku: "WG-MP-25K",  qty: 1, method: "bank-transfer", member: "Kasun Madushan" },
    { days: 28, customer: "Walk-in",         sku: "MG-GLY-120", qty: 2, method: "cash",   member: "" }
  ];

  const suppMap = new Map(supplements.map(s => [String(s.sku || "").toUpperCase(), s]));
  const createdSales = [];
  for (const sd of salesData) {
    const sup = suppMap.get(String(sd.sku).toUpperCase());
    if (!sup) { console.warn(`Supplement SKU not found: ${sd.sku}`); continue; }
    const lineTotal = sup.unitPrice * sd.qty;
    const sale = await Sale.create({
      gym: gym._id,
      customerName: sd.customer, memberName: sd.member,
      paymentMethod: sd.method, status: "paid",
      items: [{ supplement: sup._id, name: sup.name, qty: sd.qty, unitPrice: sup.unitPrice, lineTotal }],
      subtotal: lineTotal, total: lineTotal, returnAmount: 0,
      soldAt: daysAgo(sd.days)
    });
    createdSales.push(sale);
  }
  // one return
  const returnSale = createdSales[2];
  const returnSup  = suppMap.get("PW-C4-60");
  const saleReturn = await SaleReturn.create({
    gym: gym._id, sale: returnSale._id,
    customerName: "Dinesh Alwis", reason: "Wrong flavour",
    amount: returnSup.unitPrice, items: [{ supplement: returnSup._id, name: returnSup.name, qty: 1 }],
    processedAt: daysAgo(6)
  });
  await Sale.findByIdAndUpdate(returnSale._id, { returnAmount: returnSup.unitPrice, status: "partial" });

  // ── 12. Announcements ─────────────────────────────────────────────────────
  await Announcement.insertMany([
    { gym: gym._id, title: "Gym Closed – Public Holiday",       body: "Anuhas Gym will be closed on May 22 for the public holiday. We reopen May 23 at 5:30 AM.", date: daysAgo(3),  priority: "warning", audience: "all",     pinned: true,  expiresAt: daysFromNow(2) },
    { gym: gym._id, title: "New Batch: Alpha Strength Program", body: "A new 12-week Alpha Strength batch starts June 1st. Limited spots — register at the front desk.", date: daysAgo(7),  priority: "info",    audience: "members", pinned: false, expiresAt: daysFromNow(10) },
    { gym: gym._id, title: "Monthly Body Composition Assessment",body: "Free body composition checks for all active members every last Saturday. Next: May 31.", date: daysAgo(10), priority: "success", audience: "members", pinned: false, expiresAt: daysFromNow(5) },
    { gym: gym._id, title: "Staff Meeting – All Coaches",       body: "Mandatory staff meeting on June 3rd at 4:00 PM in the conference room. Attendance compulsory.", date: daysAgo(5),  priority: "warning", audience: "coaches", pinned: false, expiresAt: daysFromNow(4) },
    { gym: gym._id, title: "Supplement Sale – 15% Off",         body: "All in-stock supplements are 15% off this weekend only (May 31 – June 1). While stocks last.", date: daysAgo(1),  priority: "success", audience: "all",     pinned: true,  expiresAt: daysFromNow(3) },
    { gym: gym._id, title: "New Equipment Arriving",            body: "We're adding 2 new Concept2 rowing machines and a cable functional trainer next week.", date: daysAgo(14), priority: "info",    audience: "all",     pinned: false, expiresAt: null }
  ]);

  // ── 13. Messages ──────────────────────────────────────────────────────────
  const kaveesha = memberDocList[0];
  const kaveeshaUser = memberUserMap.get(kaveesha.def.email);
  const ruwanCoach   = coachDocMap.get("ruwan@anuhasgym.lk");
  const ruwanUser    = coachUserMap.get("ruwan@anuhasgym.lk");

  const msgPairs = [
    { coachName: "Ruwan Bandara",    memberName: "Kaveesha Perera",    coachEmail: "ruwan@anuhasgym.lk",   memberEmail: "kaveesha@anuhasgym.lk" },
    { coachName: "Shani Wickrama",   memberName: "Hiruni Jayasekara",  coachEmail: "shani@anuhasgym.lk",   memberEmail: "hiruni@anuhasgym.lk" },
    { coachName: "Pradeep Kumara",   memberName: "Sanduni Weerasinghe",coachEmail: "pradeep@anuhasgym.lk", memberEmail: "sanduni@anuhasgym.lk" },
    { coachName: "Dilani Madushani", memberName: "Isuru Niroshan",     coachEmail: "dilani@anuhasgym.lk",  memberEmail: "isuru@anuhasgym.lk" }
  ];

  for (const pair of msgPairs) {
    const cUser = coachUserMap.get(pair.coachEmail);
    const mDef  = memberDocList.find(m => m.def.name === pair.memberName);
    const mUser = mDef ? memberUserMap.get(mDef.def.email) : null;

    const convos = [
      { from: pair.coachName, role: "coach", text: `Hi ${pair.memberName.split(" ")[0]}! Great session yesterday. Keep it up 💪`, h: 9 },
      { from: pair.memberName, role: "member", text: "Thank you coach! I felt really strong today.", h: 10 },
      { from: pair.coachName, role: "coach", text: "Remember to hit your protein target — 180g today. Check your meal plan.", h: 11 },
      { from: pair.memberName, role: "member", text: "Will do! Also can we adjust Friday's session? I have a meeting at 6 PM.", h: 14 },
      { from: pair.coachName, role: "coach", text: "Sure, let's move it to 5 PM. I'll confirm tomorrow.", h: 16 }
    ];

    for (const [ci, c] of convos.entries()) {
      const dBack = ci < 3 ? 2 : ci < 4 ? 1 : 0;
      const msgTime = atHour(daysAgo(dBack), c.h);
      await Message.create({
        gym: gym._id,
        coachName: pair.coachName, memberName: pair.memberName,
        coachUser: cUser?._id || null, memberUser: mUser?._id || null,
        from: c.from, avatar: c.from.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        senderRole: c.role, recipientRole: c.role === "coach" ? "member" : "coach",
        senderUser: c.role === "coach" ? (cUser?._id || null) : (mUser?._id || null),
        recipientUser: c.role === "coach" ? (mUser?._id || null) : (cUser?._id || null),
        text: c.text,
        time: msgTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        unread: ci >= 3, createdAt: msgTime
      });
    }
  }

  // ── 14. Attendance (past 45 days) ─────────────────────────────────────────
  const activeMembers = memberDocList.filter(m => m.def.status === "active");
  const coachNames    = coachDefs.map(c => c.name);
  let attendanceCount = 0;

  for (let d = 44; d >= 0; d--) {
    // each day 4-8 members check in
    const day     = daysAgo(d);
    const numIn   = randInt(4, 8);
    const shuffled = [...activeMembers].sort(() => Math.random() - 0.5).slice(0, numIn);

    for (const m of shuffled) {
      const checkInHour = randInt(6, 20);
      const checkInAt   = atHour(day, checkInHour, randInt(0, 45));
      const duration    = randInt(45, 120);
      const checkOutAt  = d === 0 && Math.random() > 0.5 ? null : new Date(checkInAt.getTime() + duration * 60000);
      const hasBreak    = Math.random() > 0.6 && checkOutAt !== null;
      const breakStart  = hasBreak ? new Date(checkInAt.getTime() + 30 * 60000) : null;
      const breakEnd    = hasBreak ? new Date(breakStart.getTime() + 15 * 60000) : null;

      await Attendance.create({
        gym: gym._id,
        memberId: m.doc._id,
        coachName: m.def.coach,
        member: m.def.name,
        avatar: m.doc.avatar,
        time: checkInAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        date: d === 0 ? "Today" : checkInAt.toLocaleDateString("en-GB"),
        sessionDate: checkInAt,
        checkInAt, checkOutAt,
        breakStart, breakEnd,
        status: checkOutAt ? "checked-out" : "checked-in",
        sessionNumber: 1
      });
      attendanceCount++;
    }
  }
  console.log(`Created ${attendanceCount} attendance records`);

  // ── 15. Expenses ──────────────────────────────────────────────────────────
  await Expense.insertMany([
    { gym: gym._id, type: "expense", title: "Monthly Rent",             category: "Rent",        amount: 85000,  status: "paid",    paymentMethod: "bank-transfer", vendor: "Colombo Properties Ltd",   expenseDate: daysAgo(30) },
    { gym: gym._id, type: "expense", title: "Electricity Bill – April", category: "Utilities",   amount: 22400,  status: "paid",    paymentMethod: "bank-transfer", vendor: "Ceylon Electricity Board", expenseDate: daysAgo(28) },
    { gym: gym._id, type: "expense", title: "Water Bill – April",       category: "Utilities",   amount: 3800,   status: "paid",    paymentMethod: "cash",          vendor: "National Water Board",     expenseDate: daysAgo(25) },
    { gym: gym._id, type: "expense", title: "Coach Salaries – April",   category: "Salaries",    amount: 180000, status: "paid",    paymentMethod: "bank-transfer", vendor: "Payroll",                  expenseDate: daysAgo(20) },
    { gym: gym._id, type: "expense", title: "Supplement Restock",       category: "Supplies",    amount: 68000,  status: "paid",    paymentMethod: "card",          vendor: "NutriFit Imports",         expenseDate: daysAgo(18) },
    { gym: gym._id, type: "expense", title: "Treadmill Servicing",      category: "Maintenance", amount: 5000,   status: "paid",    paymentMethod: "cash",          vendor: "TechFit LK Service",       expenseDate: daysAgo(20) },
    { gym: gym._id, type: "expense", title: "Internet & CCTV",          category: "Software",    amount: 4200,   status: "paid",    paymentMethod: "bank-transfer", vendor: "Dialog Axiata",            expenseDate: daysAgo(15) },
    { gym: gym._id, type: "expense", title: "Cleaning Supplies",        category: "Supplies",    amount: 6800,   status: "paid",    paymentMethod: "cash",          vendor: "CleanMart",                expenseDate: daysAgo(12) },
    { gym: gym._id, type: "expense", title: "Facebook Ad Campaign",     category: "Marketing",   amount: 12000,  status: "paid",    paymentMethod: "card",          vendor: "Meta Ads",                 expenseDate: daysAgo(10) },
    { gym: gym._id, type: "expense", title: "New Yoga Mats (10 units)", category: "Equipment",   amount: 22500,  status: "paid",    paymentMethod: "card",          vendor: "YogaLife LK",              expenseDate: daysAgo(8) },
    { gym: gym._id, type: "expense", title: "Accountant Fee – Q1",      category: "Other Expense",amount: 15000, status: "paid",    paymentMethod: "bank-transfer", vendor: "Perera & Co Accounting",   expenseDate: daysAgo(6) },
    { gym: gym._id, type: "expense", title: "Diesel for Generator",     category: "Utilities",   amount: 4500,   status: "pending", paymentMethod: "cash",          vendor: "Fuel Station",             expenseDate: daysAgo(2) },
    { gym: gym._id, type: "income",  title: "Personal Training Fees",   category: "Personal Training", amount: 32000, status: "paid", paymentMethod: "cash",         vendor: "",                         expenseDate: daysAgo(15) },
    { gym: gym._id, type: "income",  title: "Group Class Bookings",     category: "Class Income", amount: 18500, status: "paid",    paymentMethod: "card",          vendor: "",                         expenseDate: daysAgo(7) }
  ]);

  // ── 16. Coach Attendance (past 30 days) ───────────────────────────────────
  for (const coachDoc of coaches) {
    for (let d = 29; d >= 0; d--) {
      if (d % 7 === 0) continue; // Sunday off
      const day        = daysAgo(d);
      const isEvening  = coachDefs.find(c => c.email === coachDoc.email)?.name.includes("Shani") || coachDefs.find(c => c.email === coachDoc.email)?.name.includes("Dilani");
      const clockInH   = isEvening ? 14 : 6;
      const clockIn    = atHour(day, clockInH, randInt(0, 20));
      const isToday    = d === 0;
      const clockOut   = isToday && Math.random() > 0.4 ? null : new Date(clockIn.getTime() + (6 + randInt(0, 2)) * 3600000);
      const hasBreak   = Math.random() > 0.3 && clockOut !== null;
      const breakStart = hasBreak ? new Date(clockIn.getTime() + 3 * 3600000) : null;
      const breakEnd   = hasBreak ? new Date(breakStart.getTime() + 30 * 60000) : null;

      const totalMs  = clockOut ? clockOut - clockIn : 0;
      const breakMs  = breakStart && breakEnd ? breakEnd - breakStart : 0;
      const totalWorkMinutes = Math.max(0, Math.round((totalMs - breakMs) / 60000));
      const breakMinutes     = Math.max(0, Math.round(breakMs / 60000));

      await CoachAttendance.create({
        gym: gym._id, coach: coachDoc._id, coachName: coachDoc.name,
        date: day, clockIn, clockOut,
        breakStart, breakEnd,
        totalWorkMinutes, breakMinutes,
        status: clockOut ? "clocked-out" : (breakStart && !breakEnd ? "on-break" : "clocked-in")
      });
    }
  }

  // ── 17. Salary Advances ───────────────────────────────────────────────────
  await SalaryAdvance.insertMany([
    { gym: gym._id, coach: coaches[0]._id, amount: 15000, date: daysAgo(35), reason: "Home repair emergency",    status: "deducted", note: "Deducted from March salary" },
    { gym: gym._id, coach: coaches[1]._id, amount: 10000, date: daysAgo(20), reason: "Medical expense",          status: "approved", note: "Approved by management" },
    { gym: gym._id, coach: coaches[2]._id, amount: 8000,  date: daysAgo(10), reason: "Wedding contribution",     status: "pending",  note: "Pending owner approval" },
    { gym: gym._id, coach: coaches[0]._id, amount: 20000, date: daysAgo(5),  reason: "Vehicle repair",           status: "approved", note: "Approved" },
    { gym: gym._id, coach: coaches[3]._id, amount: 5000,  date: daysAgo(2),  reason: "Advance for training cert",status: "pending",  note: "" }
  ]);

  // ── 18. Audit Logs ────────────────────────────────────────────────────────
  const ownerUserId    = ownerUser._id;
  const coachUserList  = [...coachUserMap.values()];
  const coachUserIds   = coachUserList.map(u => u._id);
  const coachFullNames = coachDefs.map(c => c.name);

  const auditEntries = [
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "create", type: "member",       name: "Kaveesha Perera",     summary: "Added new member Kaveesha Perera",           days: 45 },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "create", type: "coach",        name: "Ruwan Bandara",       summary: "Added coach Ruwan Bandara",                  days: 90 },
    { actor: coachUserIds[0],actorName: coachFullNames[0],     role: "coach",  action: "update", type: "member",       name: "Dinesh Alwis",        summary: "Updated subscription for Dinesh Alwis",      days: 8  },
    { actor: coachUserIds[1],actorName: coachFullNames[1],     role: "coach",  action: "create", type: "attendance",   name: "Hiruni Jayasekara",   summary: "Checked in Hiruni Jayasekara",               days: 1  },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "update", type: "equipment",    name: "Treadmill",           summary: "Logged service for Treadmill",               days: 20 },
    { actor: coachUserIds[0],actorName: coachFullNames[0],     role: "coach",  action: "update", type: "workout-plan", name: "Alpha Strength",      summary: "Assigned Alpha Strength to Kaveesha",        days: 11 },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "create", type: "expense",      name: "Monthly Rent",        summary: "Recorded expense: Monthly Rent LKR 85,000",  days: 30 },
    { actor: coachUserIds[2],actorName: coachFullNames[2],     role: "coach",  action: "update", type: "member",       name: "Sanduni Weerasinghe", summary: "Updated meal plan assignment",               days: 6  },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "create", type: "announcement", name: "Supplement Sale",     summary: "Created announcement: Supplement Sale",      days: 1  },
    { actor: coachUserIds[3],actorName: coachFullNames[3],     role: "coach",  action: "create", type: "attendance",   name: "Isuru Niroshan",      summary: "Checked in Isuru Niroshan",                  days: 2  },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "update", type: "member",       name: "Kasun Madushan",      summary: "Updated subscription payment",               days: 15 },
    { actor: coachUserIds[1],actorName: coachFullNames[1],     role: "coach",  action: "update", type: "member",       name: "Chamara Rathnayake",  summary: "Updated workout progress",                   days: 3  },
    { actor: coachUserIds[0],actorName: coachFullNames[0],     role: "coach",  action: "create", type: "member",       name: "Nuwan Dissanayake",   summary: "Added member Nuwan Dissanayake",             days: 60 },
    { actor: coachUserIds[2],actorName: coachFullNames[2],     role: "coach",  action: "update", type: "meal-plan",    name: "Maintenance 2400kcal",summary: "Updated meal plan: Maintenance 2400kcal",    days: 18 },
    { actor: ownerUserId,    actorName: ownerUser.name,    role: "owner",  action: "delete", type: "member",       name: "Old Trial Member",    summary: "Removed expired trial member",               days: 25 },
    { actor: coachUserIds[3],actorName: coachFullNames[3],     role: "coach",  action: "update", type: "member",       name: "Gayan Perera",        summary: "Updated goal for Gayan Perera",              days: 4  }
  ];

  for (const e of auditEntries) {
    await AuditLog.create({
      gym: gym._id,
      actorUser: e.actor, actorName: e.actorName, actorRole: e.role,
      action: e.action, targetType: e.type, targetId: "", targetName: e.name,
      summary: e.summary, before: null, after: null, changedFields: [],
      createdAt: daysAgo(e.days)
    });
  }

  // ── 19. Email Logs ────────────────────────────────────────────────────────
  await EmailLog.insertMany([
    { to: "kaveesha@anuhasgym.lk", subject: "Welcome to Anuhas Gym!", type: "welcome", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Kaveesha Perera", sentAt: monthsAgo(11), body: "Welcome aboard!" },
    { to: "dinesh@anuhasgym.lk",   subject: "Your subscription is expiring soon", type: "subscription-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Dinesh Alwis", sentAt: daysAgo(14), body: "Your plan expires in 7 days." },
    { to: "kasun@anuhasgym.lk",    subject: "Payment reminder – outstanding balance", type: "payment-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Kasun Madushan", sentAt: daysAgo(10), body: "You have an outstanding balance of LKR 54,000." },
    { to: "thilini@anuhasgym.lk",  subject: "Your membership has expired", type: "subscription-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Thilini Gunawardena", sentAt: daysAgo(5), body: "Please renew your membership." },
    { to: "amaya@anuhasgym.lk",    subject: "Password reset request", type: "reset-password", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Amaya Rodrigo", sentAt: daysAgo(3), body: "Use OTP: 482910" },
    { to: "gayan@anuhasgym.lk",    subject: "Welcome to Anuhas Gym!", type: "welcome", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Gayan Perera", sentAt: daysAgo(30), body: "Welcome aboard!" },
    { to: "hiruni@anuhasgym.lk",   subject: "Subscription renewal failed", type: "payment-reminder", status: "failed", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Hiruni Jayasekara", sentAt: daysAgo(2), body: "", errorMessage: "SMTP connection timeout" }
  ]);

  // ── 20. SMS Logs ──────────────────────────────────────────────────────────
  await SmsLog.insertMany([
    { to: "0771234001", message: "Your Anuhas Gym membership renews in 3 days. Visit us to renew.", type: "subscription-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Kaveesha Perera", provider: "Twilio", sentAt: daysAgo(7) },
    { to: "0771234006", message: "Reminder: You have an outstanding balance of LKR 54,000.", type: "payment-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Kasun Madushan", provider: "Twilio", sentAt: daysAgo(10) },
    { to: "0771234007", message: "Your Anuhas Gym membership has expired. Please renew.", type: "subscription-reminder", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Thilini Gunawardena", provider: "Twilio", sentAt: daysAgo(5) },
    { to: "0771234009", message: "Partial payment recorded. Balance remaining: LKR 16,000.", type: "payment-reminder", status: "failed", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Amaya Rodrigo", provider: "Twilio", sentAt: daysAgo(4), errorMessage: "Invalid phone number" },
    { to: "0771234012", message: "Welcome to Anuhas Gym! Your account is now active.", type: "welcome", status: "sent", gymId: gym._id, gymName: "Anuhas Gym", recipientName: "Gayan Perera", provider: "Twilio", sentAt: daysAgo(30) }
  ]);

  // ── 21. Payroll (3 months for all coaches) ───────────────────────────────────
  function monthKey(monthsBack) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - monthsBack);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function monthRange(ym) {
    const [y, m] = ym.split("-").map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
  }

  const OT_RATE = 350;

  for (let mo = 2; mo >= 0; mo--) {
    const month = monthKey(mo);
    const { start, end } = monthRange(month);
    const status = mo === 2 ? "paid" : mo === 1 ? "approved" : "draft";

    for (const [i, coachDoc] of coaches.entries()) {
      const attRecords = await CoachAttendance.find({
        gym: gym._id, coach: coachDoc._id, status: "clocked-out",
        date: { $gte: start, $lte: end }
      }).lean();
      const totalMinutes  = attRecords.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0);
      const hoursWorked   = Math.round(totalMinutes / 60 * 10) / 10;
      const standardHours = attRecords.length * 8;
      const overtimeHours = Math.max(0, Math.round((hoursWorked - standardHours) * 10) / 10);

      const advances = await SalaryAdvance.find({
        gym: gym._id, coach: coachDoc._id, status: "approved",
        date: { $gte: start, $lte: end }
      }).lean();
      const advancesDeducted = advances.reduce((s, a) => s + Number(a.amount || 0), 0);

      const baseSalary = coachDefs[i].baseSalary;
      const isFullTime = i < 2;
      const isPast = mo > 0;
      const bonuses    = (isPast && isFullTime) ? Math.round(baseSalary * 0.05 / 100) * 100 : 0;
      const otherDeductions = (isPast && i % 2 === 0) ? 1500 : 0;

      const record = new Payroll({
        gym: gym._id,
        coach: coachDoc._id,
        coachName: coachDoc.name,
        month,
        baseSalary,
        hoursWorked,
        overtimeHours,
        overtimeRate: overtimeHours > 0 ? OT_RATE : 0,
        bonuses,
        bonusNote: bonuses > 0 ? "Monthly performance bonus" : "",
        advancesDeducted,
        otherDeductions,
        deductionNote: otherDeductions > 0 ? "Late arrival deduction" : "",
        status,
        paymentMethod: status === "paid" ? ["bank-transfer", "cash", "cheque"][i % 3] : "",
        paidAt: status === "paid" ? new Date(`${month}-28`) : null,
        notes: status === "draft" ? "Auto-generated from attendance" : ""
      });
      await record.save();

      if (advances.length > 0) {
        await SalaryAdvance.updateMany(
          { _id: { $in: advances.map((a) => a._id) } },
          { status: "deducted" }
        );
      }
    }
  }
  console.log(`Created payroll records for ${coaches.length} coaches (3 months)`);

  // ── 22. Coach Leave records ───────────────────────────────────────────────────
  const leaveDefs = [
    { coachIdx: 0, type: "sick",     startDaysAgo: 45, days: 2, reason: "Fever and flu – resting on doctor's advice",   status: "approved", approvedBy: "Anuha Perera" },
    { coachIdx: 1, type: "vacation", startDaysAgo: 60, days: 5, reason: "Annual family vacation",                       status: "approved", approvedBy: "Anuha Perera" },
    { coachIdx: 2, type: "personal", startDaysAgo: 20, days: 1, reason: "Personal appointment",                         status: "approved", approvedBy: "Anuha Perera" },
    { coachIdx: 3, type: "sick",     startDaysAgo: 10, days: 1, reason: "Migraine – unable to coach",                   status: "approved", approvedBy: "Anuha Perera" },
    { coachIdx: 0, type: "emergency",startDaysAgo: 5,  days: 1, reason: "Family medical emergency",                     status: "pending",  approvedBy: "" },
    { coachIdx: 2, type: "vacation", startDaysAgo: -7, days: 3, reason: "Planned holiday – Kandy trip",                 status: "pending",  approvedBy: "" }
  ];

  for (const ld of leaveDefs) {
    const coachDoc  = coaches[ld.coachIdx];
    const startDate = daysAgo(ld.startDaysAgo);
    const endDate   = new Date(startDate);
    endDate.setDate(endDate.getDate() + ld.days - 1);

    await CoachLeave.create({
      gym: gym._id,
      coach: coachDoc._id,
      coachName: coachDoc.name,
      leaveType: ld.type,
      startDate,
      endDate,
      totalDays: ld.days,
      reason: ld.reason,
      status: ld.status,
      approvedBy: ld.approvedBy,
      approvedAt: ld.status === "approved" ? daysAgo(ld.startDaysAgo - 1) : null,
      ownerNotes: ld.status === "approved" ? "Approved – cover arranged." : ""
    });
  }
  console.log(`Created ${leaveDefs.length} coach leave records`);

  // ── 23. Suppliers ─────────────────────────────────────────────────────────────
  const supplementDocs = await Supplement.find({ gym: gym._id }).lean();
  const suppBySupplier = new Map();
  for (const s of supplementDocs) {
    if (!s.supplierName) continue;
    if (!suppBySupplier.has(s.supplierName)) suppBySupplier.set(s.supplierName, []);
    suppBySupplier.get(s.supplierName).push(s);
  }

  const supplierDefs = [
    {
      name: "NutriFit Imports",
      contactName: "Priya Jayaratne",
      phone: "+94 77 200 3344",
      email: "priya@nutrifit.lk",
      address: "No. 14, Braybrooke Place, Colombo 02",
      website: "https://nutrifit.lk",
      notes: "Main whey protein and creatine supplier. Bulk discounts on 12+ unit orders. Delivery within 48 hours."
    },
    {
      name: "SportSupply LK",
      contactName: "Nuwan Perera",
      phone: "+94 71 456 7890",
      email: "nuwan@sportsupply.lk",
      address: "45, Old Kelaniya Road, Kiribathgoda",
      website: "https://sportsupply.lk",
      notes: "Reliable supplier for pre-workout, BCAA, and protein bars. Standard trade pricing."
    },
    {
      name: "HealthFirst LK",
      contactName: "Sachith Bandara",
      phone: "+94 76 900 1122",
      email: "sachith@healthfirst.lk",
      address: "22, Industrial Estate, Biyagama",
      website: "https://healthfirst.lk",
      notes: "Omega-3 and micronutrient supplement supplier. Lead time 5-7 business days."
    }
  ];

  for (const sd of supplierDefs) {
    const products = (suppBySupplier.get(sd.name) || []).map((s) => ({
      supplementId: s._id,
      supplementName: s.name,
      supplierPrice: s.buyingPrice || 0,
      notes: "Standard trade rate"
    }));
    await Supplier.create({ gym: gym._id, ...sd, products });
  }
  console.log(`Created ${supplierDefs.length} suppliers`);

  console.log("\n✅ Anuhas Gym seed complete!");
  console.log("─────────────────────────────────────────────────");
  console.log("  Gym  : Anuhas Gym (Colombo 05)");
  console.log("  Data : Payroll (3 months) · CoachLeave · Suppliers · Full profiles");
  console.log("  See seedAnuhasGym.js header for login credentials (dev only).");
  console.log("─────────────────────────────────────────────────");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
