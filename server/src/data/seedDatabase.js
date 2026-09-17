const User = require("../models/User");
const Gym = require("../models/Gym");
const Coach = require("../models/Coach");
const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const Equipment = require("../models/Equipment");
const Announcement = require("../models/Announcement");
const WorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");
const Message = require("../models/Message");
const Attendance = require("../models/Attendance");
const Expense = require("../models/Expense");
const Supplement = require("../models/Supplement");
const Sale = require("../models/Sale");
const SaleReturn = require("../models/SaleReturn");
const seedData = require("./seedData");
const { buildCoachCode, buildMemberCode } = require("../utils/entityCodes");
const { hashPassword } = require("../utils/password");

function addMonths(dateValue, months) {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + Number(months || 1));
  return date;
}

function toIsoDate(dateValue) {
  return new Date(dateValue);
}

async function seedDatabase() {
  const existingGyms = await Gym.countDocuments();
  if (existingGyms > 0) {
    return false;
  }

  await Promise.all([
    User.deleteMany({}),
    Coach.deleteMany({}),
    Member.deleteMany({}),
    MembershipPlan.deleteMany({}),
    Equipment.deleteMany({}),
    Announcement.deleteMany({}),
    WorkoutPlan.deleteMany({}),
    MealPlan.deleteMany({}),
    Message.deleteMany({}),
    Attendance.deleteMany({}),
    Expense.deleteMany({}),
    Supplement.deleteMany({}),
    Sale.deleteMany({}),
    SaleReturn.deleteMany({}),
    Gym.deleteMany({})
  ]);

  const gyms = await Gym.insertMany(
    seedData.gyms.map((gym) => ({
      ...gym,
      joinedAt: toIsoDate(gym.joinedAt)
    }))
  );

  const firstGym = gyms[0];

  const usersByEmail = new Map();
  for (const item of seedData.users) {
    const normalizedEmail = item.email.toLowerCase().trim();
    const gymId =
      item.role === "super-admin"
        ? null
        : firstGym._id;

    const user = await User.create({
      ...item,
      status: "active",
      requestedGoal: "",
      gym: gymId,
      coachProfile: null,
      memberProfile: null
    });
    usersByEmail.set(normalizedEmail, user);
  }

  for (const member of seedData.members) {
    const normalizedEmail = String(member.email).toLowerCase().trim();
    if (!usersByEmail.has(normalizedEmail)) {
      const user = await User.create({
        name: member.name,
        email: normalizedEmail,
        passwordHash: hashPassword("gym123"),
        role: "member",
        status: "active",
        phone: "",
        bio: "",
        title: "Member",
        requestedGoal: member.goal,
        gym: firstGym._id,
        coachProfile: null,
        memberProfile: null
      });
      usersByEmail.set(normalizedEmail, user);
    }
  }

  const coachSeedUsers = [
    { name: "Dulanjan Silva", email: "dulanjan@ironpeak.lk" },
    { name: "Tharushi Fernando", email: "tharushi@ironpeak.lk" },
    { name: "Chamod Peries", email: "chamod@ironpeak.lk" },
    { name: "Pabasara Jayawardena", email: "pabasara@ironpeak.lk" },
    { name: "Kasun Jayasinghe", email: "kasun@ironpeak.lk" }
  ];

  for (const coachUser of coachSeedUsers) {
    const normalizedEmail = coachUser.email.toLowerCase().trim();
    if (!usersByEmail.has(normalizedEmail)) {
      const user = await User.create({
        name: coachUser.name,
        email: normalizedEmail,
        passwordHash: hashPassword("gym123"),
        role: "coach",
        status: "active",
        phone: "",
        bio: "",
        title: "Coach",
        requestedGoal: "",
        gym: firstGym._id,
        coachProfile: null,
        memberProfile: null
      });
      usersByEmail.set(normalizedEmail, user);
    }
  }

  const coaches = await Promise.all(
    seedData.coaches.map(async (coach) => {
      const user = usersByEmail.get(String(coach.email).toLowerCase().trim()) || null;
      const createdCoach = new Coach({
        gym: firstGym._id,
        user: user?._id || null,
        ...coach,
        joinedAt: toIsoDate(coach.joinedAt)
      });
      createdCoach.coachCode = buildCoachCode(createdCoach._id);
      await createdCoach.save();

      if (user) {
        await User.findByIdAndUpdate(user._id, { coachProfile: createdCoach._id });
      }

      return createdCoach;
    })
  );

  const membershipPlans = await MembershipPlan.insertMany(
    seedData.membershipPlans.map((plan) => ({
      gym: firstGym._id,
      ...plan
    }))
  );

  const workoutPlans = await WorkoutPlan.insertMany(
    seedData.workoutPlans.map((plan) => ({
      gym: firstGym._id,
      ...plan
    }))
  );

  const mealPlans = await MealPlan.insertMany(
    seedData.mealPlans.map((plan) => ({
      gym: firstGym._id,
      ...plan
    }))
  );

  const members = [];
  for (const [index, member] of seedData.members.entries()) {
    const user = usersByEmail.get(String(member.email).toLowerCase().trim()) || null;
    const joinedAt = toIsoDate(member.joinedAt);
    const membershipStart = joinedAt;
    const memberDoc = new Member({
      gym: firstGym._id,
      user: user?._id || null,
      name: member.name,
      coach: member.coach,
      plan: member.plan,
      subscriptionDurationMonths: member.subscriptionDurationMonths,
      status: member.status,
      joinedAt,
      planStartedAt: membershipStart,
      checkIns: member.checkIns,
      goal: member.goal,
      heightCm: 160 + index * 2,
      emergencyContact: `07${70 + index}123456`,
      planExpiresAt: addMonths(membershipStart, member.subscriptionDurationMonths),
      paymentStatus: member.paymentStatus,
      amountPaid: member.amountPaid,
      amountDue: member.amountDue,
      dietPlanName: member.dietPlanName,
      avatar: member.avatar,
      progress: member.progress,
      myStats: member.name === "Kavindu Perera" ? seedData.memberStats : {
        weight: [68 + index, 68.5 + index],
        bodyFat: [20 - index * 0.3, 19.6 - index * 0.3],
        labels: ["Mar", "Apr"],
        benchPress: [50 + index * 2, 52 + index * 2],
        checkInsThisMonth: Math.max(4, Math.round(member.checkIns / 5)),
        streak: Math.min(6, index + 2),
        totalCheckIns: member.checkIns
      },
      myWorkoutPlan: member.name === "Kavindu Perera" ? seedData.memberWorkoutPlan : {
        name: workoutPlans[index % workoutPlans.length].name,
        week: 2,
        totalWeeks: 8,
        today: {
          day: "Conditioning Session",
          exercises: [
            { name: "Dynamic Warmup", sets: 1, reps: "10 min", rest: "0", done: true },
            { name: "Main Circuit", sets: 4, reps: "12", rest: "60 sec", done: false }
          ]
        }
      },
      myMealPlan: member.name === "Kavindu Perera" ? seedData.memberMealPlan : {
        name: member.dietPlanName,
        meals: [
          { time: "7:00 AM", name: "Breakfast", foods: ["Oats", "Eggs", "Fruit"], cals: 520, protein: 28, carbs: 55, fat: 18 },
          { time: "1:00 PM", name: "Lunch", foods: ["Rice", "Chicken", "Vegetables"], cals: 680, protein: 42, carbs: 70, fat: 18 },
          { time: "7:00 PM", name: "Dinner", foods: ["Fish", "Sweet potato", "Salad"], cals: 610, protein: 38, carbs: 52, fat: 16 }
        ]
      }
    });
    memberDoc.memberCode = buildMemberCode(memberDoc._id);
    await memberDoc.save();

    if (user) {
      await User.findByIdAndUpdate(user._id, { memberProfile: memberDoc._id });
    }

    members.push(memberDoc);
  }

  await Equipment.insertMany(
    seedData.equipment.map((item) => ({
      gym: firstGym._id,
      ...item,
      lastService: toIsoDate(item.lastService),
      nextServiceDate: toIsoDate(item.nextServiceDate)
    }))
  );

  await Announcement.insertMany(
    seedData.announcements.map((item) => ({
      gym: firstGym._id,
      ...item,
      date: toIsoDate(item.date)
    }))
  );

  await Message.insertMany(
    seedData.messages.map((item) => ({
      gym: firstGym._id,
      ...item
    }))
  );

  const membersByName = new Map(members.map((member) => [member.name, member]));
  await Attendance.insertMany(
    seedData.attendance.map((item, index) => {
      const now = new Date();
      const [hours, minutes] = String(item.time).replace(/[^0-9:]/g, "").split(":");
      const checkInAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hours || 6), Number(minutes || 0));
      const checkOutAt = index % 2 === 0 ? new Date(checkInAt.getTime() + 90 * 60000) : null;
      const member = membersByName.get(item.member);

      return {
        gym: firstGym._id,
        memberId: member?._id || null,
        coachName: item.coachName,
        member: item.member,
        avatar: item.avatar,
        time: item.time,
        date: item.date,
        sessionDate: checkInAt,
        checkInAt,
        checkOutAt,
        status: checkOutAt ? "checked-out" : "checked-in"
      };
    })
  );

  await Expense.insertMany(
    seedData.expenses.map((item) => ({
      gym: firstGym._id,
      ...item,
      expenseDate: toIsoDate(item.expenseDate)
    }))
  );

  const supplements = await Supplement.insertMany(
    seedData.supplements.map((item) => ({
      gym: firstGym._id,
      ...item
    }))
  );

  const supplementsBySku = new Map(supplements.map((item) => [item.sku, item]));

  const sales = [];
  for (const item of seedData.sales) {
    const saleItems = item.items.map((entry) => {
      const supplement = supplementsBySku.get(entry.sku);
      const qty = Number(entry.qty);
      const unitPrice = Number(supplement?.unitPrice || 0);
      return {
        supplement: supplement?._id || null,
        name: supplement?.name || entry.sku,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice
      };
    });

    const subtotal = saleItems.reduce((sum, entry) => sum + entry.lineTotal, 0);
    const sale = await Sale.create({
      gym: firstGym._id,
      customerName: item.customerName,
      memberName: item.memberName,
      paymentMethod: item.paymentMethod,
      status: item.status,
      items: saleItems,
      subtotal,
      total: subtotal,
      returnAmount: 0,
      notes: item.notes,
      soldAt: toIsoDate(item.soldAt)
    });
    sales.push(sale);
  }

  if (sales[1]) {
    const returnSeed = seedData.saleReturns[0];
    const relatedSupplement = supplementsBySku.get(returnSeed.items[0].sku);
    await SaleReturn.create({
      gym: firstGym._id,
      sale: sales[1]._id,
      customerName: returnSeed.customerName,
      reason: returnSeed.reason,
      amount: returnSeed.amount,
      items: [{
        supplement: relatedSupplement?._id || null,
        name: relatedSupplement?.name || returnSeed.items[0].sku,
        qty: returnSeed.items[0].qty
      }],
      processedAt: toIsoDate(returnSeed.processedAt)
    });

    await Sale.findByIdAndUpdate(sales[1]._id, {
      returnAmount: returnSeed.amount,
      status: "partial"
    });
  }

  return true;
}

module.exports = seedDatabase;
