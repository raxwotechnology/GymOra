const Gym = require("../../models/Gym");
const User = require("../../models/User");
const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const MembershipPlan = require("../../models/MembershipPlan");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const Equipment = require("../../models/Equipment");
const Announcement = require("../../models/Announcement");
const WorkoutPlan = require("../../models/WorkoutPlan");
const MealPlan = require("../../models/MealPlan");
const Message = require("../../models/Message");
const Attendance = require("../../models/Attendance");
const Expense = require("../../models/Expense");
const Supplement = require("../../models/Supplement");
const Sale = require("../../models/Sale");
const SaleReturn = require("../../models/SaleReturn");
const AuditLog = require("../../models/AuditLog");
const { expireMembersByFilter } = require("../../utils/subscription");
const { emptyOwnerDashboard, emptyCoachDashboard, emptyMemberDashboard } = require("./dashboardUtils");
const { handleSuperAdmin } = require("./superAdminDashboard");
const { handleOwner } = require("./ownerDashboard");
const { handleCoach } = require("./coachDashboard");
const { handleMember } = require("./memberDashboard");

async function getDashboard(req, res) {
  const user = req.user;
  const role = user?.role;

  if (!user || !role) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (role === "super-admin") {
    return handleSuperAdmin(req, res);
  }

  const gymId = user.gym;
  if (!gymId) {
    if (role === "owner") return res.json(emptyOwnerDashboard());
    if (role === "coach" || role === "staff") return res.json(emptyCoachDashboard());
    if (role === "member") return res.json(emptyMemberDashboard());
    return res.status(400).json({ message: "User is not assigned to a gym" });
  }

  await expireMembersByFilter(Member, { gym: gymId });

  const [gym, coaches, members, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, gymUsers, auditLogs, subscriptionPlans] =
    await Promise.all([
      Gym.findById(gymId).lean(),
      Coach.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Member.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      MembershipPlan.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Equipment.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Announcement.find({ gym: gymId }).sort({ date: -1 }).lean(),
      WorkoutPlan.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      MealPlan.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Message.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Attendance.find({ gym: gymId }).sort({ sessionDate: -1, createdAt: -1 }).lean(),
      Expense.find({ gym: gymId }).sort({ expenseDate: -1, createdAt: -1 }).lean(),
      Supplement.find({ gym: gymId }).sort({ createdAt: 1 }).lean(),
      Sale.find({ gym: gymId }).sort({ soldAt: -1, createdAt: -1 }).lean(),
      SaleReturn.find({ gym: gymId }).sort({ processedAt: -1, createdAt: -1 }).lean(),
      User.find({ gym: gymId })
        .sort({ createdAt: 1 })
        .select("_id role status name email phone requestedGoal createdAt profileImageUrl")
        .lean(),
      AuditLog.find({ gym: gymId, actorRole: "coach" }).sort({ createdAt: -1 }).limit(500).lean(),
      SubscriptionPlan.find({ isActive: { $ne: false } }).select("name price billingCycle features color description").lean()
    ]);

  const userImageById = new Map(gymUsers.map((item) => [String(item._id), item.profileImageUrl || ""]));
  const userById = new Map(gymUsers.map((item) => [String(item._id), item]));
  const pendingUsers = gymUsers.filter((item) => item.role === "member" && item.status === "pending");
  const membersWithImages = members.map((member) => ({
    ...member,
    profileImageUrl: userImageById.get(String(member.user)) || "",
    email: userById.get(String(member.user))?.email || ""
  }));
  const coachesWithImages = coaches.map((coach) => ({
    ...coach,
    profileImageUrl: userImageById.get(String(coach.user)) || "",
    phone: userById.get(String(coach.user))?.phone || ""
  }));
  const memberImageByMemberId = new Map(
    membersWithImages.map((member) => [String(member._id), member.profileImageUrl || ""])
  );

  if (!gym) {
    if (role === "owner") return res.json(emptyOwnerDashboard());
    if (role === "coach") return res.json(emptyCoachDashboard());
    if (role === "member") return res.json(emptyMemberDashboard());
    return res.status(404).json({ message: "Gym not found" });
  }

  const sharedData = { gym, coaches: coachesWithImages, members: membersWithImages, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, pendingUsers, auditLogs, memberImageByMemberId, userImageById, userById, user, subscriptionPlans };

  if (role === "owner") return handleOwner(req, res, sharedData);
  if (role === "coach" || role === "staff") return handleCoach(req, res, sharedData);
  if (role === "member") return handleMember(req, res, sharedData);

  return res.status(400).json({ message: "Unsupported role" });
}

module.exports = { getDashboard };
