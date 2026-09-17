const { hashPassword } = require("../utils/password");

const gymRevenueHistory = {
  "IronPeak Gym": [9800, 10200, 10900, 11400, 11900, 12400],
  "FlexZone Fitness": [6200, 6500, 6900, 7100, 7500, 7800],
  "PeakForm Studio": [4800, 5100, 5400, 5700, 6000, 6200],
  UrbanLift: [600, 900, 1300, 1700, 1900, 2100],
  CoreForce: [13100, 13600, 14100, 14700, 15100, 15600],
  "AthletiX Hub": [1200, 1000, 800, 400, 0, 0]
};

const gyms = [
  { name: "IronPeak Gym", ownerName: "Kasun Jayasinghe", ownerEmail: "owner@fitnesshub.io", location: "Colombo", status: "active", plan: "Pro", joinedAt: "2024-03-12" },
  { name: "FlexZone Fitness", ownerName: "Dinithi Fernando", ownerEmail: "dinithi@fitnesshub.io", location: "Kandy", status: "active", plan: "Starter", joinedAt: "2024-06-01" },
  { name: "PeakForm Studio", ownerName: "Tharindu Senanayake", ownerEmail: "tharindu@fitnesshub.io", location: "Galle", status: "active", plan: "Pro", joinedAt: "2024-09-18" },
  { name: "UrbanLift", ownerName: "Nimali Wijesinghe", ownerEmail: "nimali@fitnesshub.io", location: "Kurunegala", status: "trial", plan: "Starter", joinedAt: "2025-01-05" },
  { name: "CoreForce", ownerName: "Ravindu Gunaratne", ownerEmail: "ravindu@fitnesshub.io", location: "Negombo", status: "active", plan: "Enterprise", joinedAt: "2024-01-20" },
  { name: "AthletiX Hub", ownerName: "Ishara Weerakoon", ownerEmail: "ishara@fitnesshub.io", location: "Jaffna", status: "suspended", plan: "Starter", joinedAt: "2024-11-30" }
].map((gym) => ({
  ...gym,
  revenueHistory: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((month, index) => ({
    month,
    value: gymRevenueHistory[gym.name][index]
  }))
}));

const users = [
  { name: "Nadeesha Perera", email: "admin@fitnesshub.io", passwordHash: hashPassword("admin123"), role: "super-admin" },
  { name: "Kasun Jayasinghe", email: "owner@fitnesshub.io", passwordHash: hashPassword("gym123"), role: "owner" },
  { name: "Nethmi Perera", email: "coach@fitnesshub.io", passwordHash: hashPassword("gym123"), role: "coach" },
  { name: "Kavindu Perera", email: "member@fitnesshub.io", passwordHash: hashPassword("gym123"), role: "member" }
];

const coaches = [
  { name: "Nethmi Perera", specialty: "Strength & Conditioning", members: 22, status: "active", email: "coach@fitnesshub.io", joinedAt: "2023-05-10", avatar: "SR" },
  { name: "Dulanjan Silva", specialty: "HIIT & Cardio", members: 18, status: "active", email: "dulanjan@ironpeak.lk", joinedAt: "2023-08-22", avatar: "LN" },
  { name: "Tharushi Fernando", specialty: "Yoga & Mobility", members: 30, status: "active", email: "tharushi@ironpeak.lk", joinedAt: "2022-11-01", avatar: "AD" },
  { name: "Chamod Peries", specialty: "Powerlifting", members: 15, status: "active", email: "chamod@ironpeak.lk", joinedAt: "2024-01-15", avatar: "RW" },
  { name: "Pabasara Jayawardena", specialty: "CrossFit", members: 25, status: "active", email: "pabasara@ironpeak.lk", joinedAt: "2023-03-08", avatar: "EP" },
  { name: "Kasun Jayasinghe", specialty: "General Fitness (Owner)", members: 12, status: "active", email: "kasun@ironpeak.lk", joinedAt: "2022-01-01", avatar: "MJ" }
];

const membershipPlans = [
  { name: "1 Month", durationMonths: 1, price: 12000, features: ["Gym access", "1 coach session/mo", "App access"], color: "#4a8cff" },
  { name: "3 Months", durationMonths: 3, price: 32000, features: ["Gym access", "4 coach sessions/mo", "Meal plan", "App access"], color: "#00c9a7" },
  { name: "12 Months", durationMonths: 12, price: 108000, features: ["Unlimited access", "Unlimited coaching", "Custom meal plan", "Priority booking", "App access"], color: "#f7a64a" }
];

const members = [
  { name: "Kavindu Perera", email: "member@fitnesshub.io", coach: "Nethmi Perera", plan: "3 Months", subscriptionDurationMonths: 3, paymentStatus: "paid", amountPaid: 32000, amountDue: 32000, dietPlanName: "Muscle Gain 3200kcal", status: "active", joinedAt: "2024-02-14", checkIns: 48, goal: "Muscle Gain", avatar: "TB", progress: 72 },
  { name: "Anudi Fernando", email: "anudi@fitnesshub.io", coach: "Dulanjan Silva", plan: "1 Month", subscriptionDurationMonths: 1, paymentStatus: "partial", amountPaid: 8000, amountDue: 12000, dietPlanName: "Cut Protocol 1800kcal", status: "active", joinedAt: "2024-05-01", checkIns: 31, goal: "Weight Loss", avatar: "JW", progress: 58 },
  { name: "Heshan Wickramasinghe", email: "heshan@fitnesshub.io", coach: "Nethmi Perera", plan: "3 Months", subscriptionDurationMonths: 3, paymentStatus: "paid", amountPaid: 32000, amountDue: 32000, dietPlanName: "Performance Fuel 2800kcal", status: "active", joinedAt: "2023-11-20", checkIns: 92, goal: "Strength", avatar: "OH", progress: 85 },
  { name: "Yashoda De Silva", email: "yashoda@fitnesshub.io", coach: "Tharushi Fernando", plan: "1 Month", subscriptionDurationMonths: 1, paymentStatus: "paid", amountPaid: 12000, amountDue: 12000, dietPlanName: "Maintenance 2400kcal", status: "active", joinedAt: "2024-07-08", checkIns: 22, goal: "Flexibility", avatar: "CM", progress: 40 },
  { name: "Dinuka Rajapaksha", email: "dinuka@fitnesshub.io", coach: "Chamod Peries", plan: "12 Months", subscriptionDurationMonths: 12, paymentStatus: "paid", amountPaid: 108000, amountDue: 108000, dietPlanName: "Performance Fuel 2800kcal", status: "active", joinedAt: "2023-08-30", checkIns: 115, goal: "Powerlifting", avatar: "NG", progress: 91 },
  { name: "Maleesha Perera", email: "maleesha@fitnesshub.io", coach: "Pabasara Jayawardena", plan: "3 Months", subscriptionDurationMonths: 3, paymentStatus: "unpaid", amountPaid: 0, amountDue: 32000, dietPlanName: "Maintenance 2400kcal", status: "inactive", joinedAt: "2024-01-12", checkIns: 5, goal: "CrossFit", avatar: "AT", progress: 15 },
  { name: "Sasindu Herath", email: "sasindu@fitnesshub.io", coach: "Nethmi Perera", plan: "12 Months", subscriptionDurationMonths: 12, paymentStatus: "paid", amountPaid: 108000, amountDue: 108000, dietPlanName: "Muscle Gain 3200kcal", status: "active", joinedAt: "2023-06-18", checkIns: 140, goal: "Muscle Gain", avatar: "KP", progress: 94 },
  { name: "Nimali Abeysekara", email: "nimali.member@fitnesshub.io", coach: "Tharushi Fernando", plan: "1 Month", subscriptionDurationMonths: 1, paymentStatus: "partial", amountPaid: 6000, amountDue: 12000, dietPlanName: "Maintenance 2400kcal", status: "active", joinedAt: "2024-09-01", checkIns: 18, goal: "Wellness", avatar: "LC", progress: 33 }
];

const memberStats = {
  weight: [82, 83, 82.5, 83.5, 84, 83.8, 84.5, 85, 85.2, 85.8, 86, 86.4],
  bodyFat: [18.5, 18.2, 17.9, 17.6, 17.4, 17.1, 16.8, 16.5, 16.2, 15.9, 15.7, 15.4],
  labels: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  benchPress: [80, 85, 87.5, 90, 92.5, 95, 97.5, 100, 102.5, 105, 107.5, 110],
  checkInsThisMonth: 18,
  streak: 5,
  totalCheckIns: 94
};

const memberWorkoutPlan = {
  name: "Alpha Strength Program",
  week: 6,
  totalWeeks: 12,
  today: {
    day: "Day 3 - Push (Chest, Shoulders, Triceps)",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "2 min", done: true },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "90 sec", done: true },
      { name: "Cable Flyes", sets: 3, reps: "12-15", rest: "60 sec", done: false },
      { name: "Overhead Press", sets: 4, reps: "8-10", rest: "90 sec", done: false },
      { name: "Lateral Raises", sets: 3, reps: "15-20", rest: "45 sec", done: false },
      { name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60 sec", done: false }
    ]
  }
};

const memberMealPlan = {
  name: "Muscle Gain 3200kcal",
  meals: [
    { time: "7:30 AM", name: "Breakfast", foods: ["4 eggs scrambled", "2 slices whole grain toast", "1 cup oats", "1 banana"], cals: 720, protein: 42, carbs: 95, fat: 22 },
    { time: "10:30 AM", name: "Mid-Morning Snack", foods: ["Greek yogurt (200g)", "Mixed berries", "25g almonds"], cals: 320, protein: 22, carbs: 28, fat: 12 },
    { time: "1:00 PM", name: "Lunch", foods: ["200g chicken breast", "1.5 cups brown rice", "Steamed broccoli", "Olive oil drizzle"], cals: 680, protein: 55, carbs: 78, fat: 14 },
    { time: "4:00 PM", name: "Pre-Workout", foods: ["Whey protein shake", "1 large apple", "Rice cakes x3"], cals: 420, protein: 38, carbs: 52, fat: 5 },
    { time: "7:30 PM", name: "Dinner", foods: ["200g salmon", "Sweet potato (250g)", "Mixed salad", "Avocado 1/2"], cals: 760, protein: 50, carbs: 68, fat: 28 },
    { time: "9:30 PM", name: "Evening Snack", foods: ["Cottage cheese 200g", "Casein protein shake"], cals: 300, protein: 40, carbs: 18, fat: 6 }
  ]
};

const workoutPlans = [
  { name: "Alpha Strength Program", level: "Intermediate", duration: "12 weeks", days: 4, category: "Strength" },
  { name: "HIIT Shred 8-Week", level: "Advanced", duration: "8 weeks", days: 5, category: "Cardio" },
  { name: "Beginner Foundation", level: "Beginner", duration: "6 weeks", days: 3, category: "General" },
  { name: "Powerlifting Peaking", level: "Advanced", duration: "16 weeks", days: 4, category: "Powerlifting" },
  { name: "Functional Fitness", level: "Intermediate", duration: "10 weeks", days: 3, category: "Functional" }
];

const mealPlans = [
  { name: "Muscle Gain 3200kcal", calories: 3200, protein: 220, carbs: 380, fat: 90, goal: "Muscle Gain" },
  { name: "Cut Protocol 1800kcal", calories: 1800, protein: 180, carbs: 140, fat: 55, goal: "Weight Loss" },
  { name: "Maintenance 2400kcal", calories: 2400, protein: 160, carbs: 280, fat: 75, goal: "Maintenance" },
  { name: "Performance Fuel 2800kcal", calories: 2800, protein: 200, carbs: 330, fat: 80, goal: "Performance" }
];

const equipment = [
  { name: "Power Racks", qty: 8, status: "good", lastService: "2025-02-10", nextServiceDate: "2025-05-10" },
  { name: "Treadmills", qty: 12, status: "good", lastService: "2025-03-01", nextServiceDate: "2025-06-01" },
  { name: "Dumbbells (5-100lb)", qty: 1, status: "good", lastService: "2025-01-20", nextServiceDate: "2025-04-20" },
  { name: "Rowing Machines", qty: 6, status: "maintenance", lastService: "2025-04-15", nextServiceDate: "2025-05-30" },
  { name: "Cable Machines", qty: 10, status: "good", lastService: "2025-02-28", nextServiceDate: "2025-05-28" },
  { name: "Leg Press Machines", qty: 4, status: "good", lastService: "2025-01-05", nextServiceDate: "2025-04-05" },
  { name: "Battle Ropes", qty: 4, status: "replace", lastService: "2024-11-10", nextServiceDate: "2025-02-10" }
];

const announcements = [
  { title: "New Equipment Arriving", body: "3 new cable machines arriving May 5th. Area 2 will be closed for setup.", date: "2025-04-28", priority: "info" },
  { title: "Holiday Hours - May Long Weekend", body: "Gym will be open 8am-4pm on May 17-18.", date: "2025-04-25", priority: "warning" },
  { title: "Summer Transformation Challenge", body: "Sign up for our 12-week challenge starting June 1st. Limited spots!", date: "2025-04-20", priority: "success" }
];

const messages = [
  { coachName: "Nethmi Perera", memberName: "Kavindu Perera", from: "Kavindu Perera", avatar: "TB", text: "Coach, can we move tomorrow's session to 6.30pm?", time: "10:32 AM", unread: true },
  { coachName: "Nethmi Perera", memberName: "Heshan Wickramasinghe", from: "Heshan Wickramasinghe", avatar: "OH", text: "Crushed the deadlift PR today!", time: "9:15 AM", unread: true },
  { coachName: "Nethmi Perera", memberName: "Sasindu Herath", from: "Sasindu Herath", avatar: "KP", text: "What should I eat before my early morning session?", time: "Yesterday", unread: false }
];

const attendance = [
  { coachName: "Nethmi Perera", member: "Kavindu Perera", avatar: "TB", time: "6:02 AM", date: "Today" },
  { coachName: "Nethmi Perera", member: "Heshan Wickramasinghe", avatar: "OH", time: "6:15 AM", date: "Today" },
  { coachName: "Nethmi Perera", member: "Dinuka Rajapaksha", avatar: "NG", time: "7:00 AM", date: "Today" },
  { coachName: "Nethmi Perera", member: "Sasindu Herath", avatar: "KP", time: "7:33 AM", date: "Today" },
  { coachName: "Nethmi Perera", member: "Anudi Fernando", avatar: "JW", time: "8:10 AM", date: "Today" },
  { coachName: "Nethmi Perera", member: "Nimali Abeysekara", avatar: "LC", time: "9:00 AM", date: "Today" }
];

const expenses = [
  { type: "expense", sourceType: "manual", title: "Monthly Rent", category: "Rent", amount: 185000, status: "paid", vendor: "Ceylon Property Holdings", contactName: "Accounts Team", paymentMethod: "bank-transfer", referenceNumber: "RENT-MAY-001", notes: "Main gym branch lease payment", expenseDate: "2026-05-01" },
  { type: "expense", sourceType: "manual", title: "Electricity Bill", category: "Utilities", amount: 42800, status: "paid", vendor: "CEB", contactName: "CEB Billing", paymentMethod: "bank-transfer", referenceNumber: "UTIL-APR-104", notes: "April utility bill", expenseDate: "2026-05-03" },
  { type: "expense", sourceType: "manual", title: "Protein Restock", category: "Inventory", amount: 96000, status: "pending", vendor: "Lanka Nutrition Imports", contactName: "Supply Desk", paymentMethod: "credit", referenceNumber: "INV-SUP-551", notes: "Awaiting supplier settlement", expenseDate: "2026-05-05" },
  { type: "expense", sourceType: "manual", title: "Coach Payroll", category: "Payroll", amount: 275000, status: "paid", vendor: "Internal Payroll", contactName: "Finance Team", paymentMethod: "bank-transfer", referenceNumber: "PAY-COACH-05", notes: "Monthly coaching payroll", expenseDate: "2026-05-02" },
  { type: "income", sourceType: "manual", title: "Corporate Wellness Session", category: "Corporate Training", amount: 85000, status: "paid", vendor: "Axis Tech", contactName: "HR Department", paymentMethod: "bank-transfer", referenceNumber: "INC-CORP-221", notes: "Weekend group wellness booking", expenseDate: "2026-05-04" },
  { type: "income", sourceType: "manual", title: "Personal Training Package", category: "Personal Training", amount: 42000, status: "pending", vendor: "Walk-in Client", contactName: "Niroshan", paymentMethod: "cash", referenceNumber: "INC-PT-114", notes: "Three-session PT package to be settled after final session", expenseDate: "2026-05-06" }
];

const supplements = [
  { name: "Whey Protein Gold", sku: "SUP-001", brand: "Optimum Labs", category: "Protein", stockQty: 24, unitPrice: 18500, reorderLevel: 8, status: "in-stock" },
  { name: "Creatine Monohydrate", sku: "SUP-002", brand: "StrengthCore", category: "Performance", stockQty: 7, unitPrice: 8900, reorderLevel: 10, status: "low-stock" },
  { name: "Pre-Workout Nitro", sku: "SUP-003", brand: "IronFuel", category: "Energy", stockQty: 0, unitPrice: 11200, reorderLevel: 6, status: "out-of-stock" },
  { name: "BCAA Recovery", sku: "SUP-004", brand: "FitLabs", category: "Recovery", stockQty: 16, unitPrice: 7400, reorderLevel: 5, status: "in-stock" }
];

const sales = [
  {
    customerName: "Kavindu Perera",
    memberName: "Kavindu Perera",
    paymentMethod: "card",
    status: "paid",
    items: [{ sku: "SUP-001", qty: 1 }, { sku: "SUP-002", qty: 1 }],
    notes: "Counter sale after training session",
    soldAt: "2026-05-04"
  },
  {
    customerName: "Walk-in Customer",
    memberName: "",
    paymentMethod: "cash",
    status: "paid",
    items: [{ sku: "SUP-004", qty: 2 }],
    notes: "Front desk sale",
    soldAt: "2026-05-06"
  }
];

const saleReturns = [
  {
    customerName: "Walk-in Customer",
    reason: "Sealed tub returned due to wrong flavor",
    amount: 7400,
    items: [{ sku: "SUP-004", qty: 1 }],
    processedAt: "2026-05-07"
  }
];

module.exports = {
  users,
  gyms,
  coaches,
  members,
  memberStats,
  memberWorkoutPlan,
  memberMealPlan,
  membershipPlans,
  equipment,
  announcements,
  workoutPlans,
  mealPlans,
  messages,
  attendance,
  expenses,
  supplements,
  sales,
  saleReturns
};
