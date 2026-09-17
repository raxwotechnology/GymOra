const Gym = require("../models/Gym");
const User = require("../models/User");
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
const AuditLog = require("../models/AuditLog");
const { expireMembersByFilter } = require("../utils/subscription");

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDateTime(date) {
  return new Date(date).toISOString();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseAttendanceDate(value) {
  if (!value) {
    return null;
  }

  if (value === "Today") {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a, b) {
  const left = startOfDay(a).getTime();
  const right = startOfDay(b).getTime();
  return Math.round((right - left) / 86400000);
}

function getNextPlanRenewal(member) {
  if (member?.planExpiresAt) {
    return new Date(member.planExpiresAt);
  }

  if (!member?.joinedAt) {
    return null;
  }

  const joinedAt = new Date(member.joinedAt);
  const durationMonths = Number(member.subscriptionDurationMonths || 1);
  return new Date(joinedAt.getFullYear(), joinedAt.getMonth() + durationMonths, joinedAt.getDate());
}

function calculateRemainingBalance(member) {
  const total = Number(member?.amountDue || 0);
  const paid = Number(member?.amountPaid || 0);
  return Math.max(0, total - paid);
}

function buildNotification(id, type, severity, title, body, meta = {}) {
  return {
    id,
    type,
    severity,
    title,
    body,
    ...meta
  };
}

function buildAnnouncementNotifications(announcements, prefix = "announcement") {
  return announcements.slice(0, 3).map((announcement) => buildNotification(
    `${prefix}-${announcement._id}`,
    "announcement",
    announcement.priority,
    announcement.title,
    announcement.body,
    { date: formatDate(announcement.date) }
  ));
}

function buildExpiringPlanNotifications(members, prefix = "plan") {
  const now = new Date();
  return members
    .filter((member) => member.status === "active")
    .map((member) => {
      const renewalDate = getNextPlanRenewal(member);
      if (!renewalDate) {
        return null;
      }

      const days = daysBetween(now, renewalDate);
      if (days < 0 || days > 7) {
        return null;
      }

      return buildNotification(
        `${prefix}-${member._id}`,
        "plan-expiry",
        days <= 2 ? "warning" : "info",
        `${member.name}'s plan renews soon`,
        `${member.plan} renews on ${formatDate(renewalDate)}.`,
        { memberId: String(member._id) }
      );
    })
    .filter(Boolean);
}

function buildEquipmentNotifications(equipment, prefix = "equipment") {
  const now = new Date();
  return equipment
    .map((item) => {
      const lastService = new Date(item.lastService);
      const daysSinceService = Math.round((now.getTime() - lastService.getTime()) / 86400000);
      const needsAttention = item.status !== "good" || daysSinceService >= 90;

      if (!needsAttention) {
        return null;
      }

      return buildNotification(
        `${prefix}-${item._id}`,
        "equipment-service",
        item.status === "replace" ? "warning" : "info",
        `${item.name} needs service follow-up`,
        `Status is ${item.status} and last service was ${formatDate(item.lastService)}.`,
        { equipmentId: String(item._id) }
      );
    })
    .filter(Boolean);
}

function buildMissedCheckInNotifications(members, attendance, prefix = "checkin") {
  const checkedInToday = new Set(
    attendance
      .filter((item) => item.date === "Today" || daysBetween(new Date(), parseAttendanceDate(item.date) || new Date(0)) === 0)
      .map((item) => item.member)
  );

  return members
    .filter((member) => member.status === "active" && !checkedInToday.has(member.name))
    .slice(0, 5)
    .map((member) => buildNotification(
      `${prefix}-${member._id}`,
      "missed-checkin",
      "warning",
      `${member.name} has not checked in today`,
      `${member.name} is active but has no attendance record for today.`,
      { memberId: String(member._id) }
    ));
}

function buildLowStockNotifications(supplements, prefix = "supplement") {
  return supplements
    .filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
    .slice(0, 5)
    .map((item) => buildNotification(
      `${prefix}-${item._id}`,
      "inventory",
      item.status === "out-of-stock" ? "warning" : "info",
      `${item.name} inventory is ${item.status}`,
      `${item.stockQty} units remaining. Reorder level is ${item.reorderLevel}.`,
      { supplementId: String(item._id) }
    ));
}

function buildPendingPaymentNotifications(members, prefix = "payment") {
  return members
    .filter((member) => member.paymentStatus !== "paid")
    .slice(0, 5)
    .map((member) => buildNotification(
      `${prefix}-${member._id}`,
      "payment",
      member.paymentStatus === "unpaid" ? "warning" : "info",
      `${member.name} has a ${member.paymentStatus} subscription`,
      `Remaining balance: LKR ${calculateRemainingBalance(member).toLocaleString()}.`,
      { memberId: String(member._id) }
    ));
}

function buildMemberNotifications(member, announcements, attendance) {
  const base = buildAnnouncementNotifications(announcements, "member-announcement");
  const renewalDate = getNextPlanRenewal(member);
  const notifications = [...base];

  if (renewalDate) {
    const days = daysBetween(new Date(), renewalDate);
    if (days >= 0 && days <= 7) {
      notifications.push(buildNotification(
        `member-plan-${member._id}`,
        "plan-expiry",
        days <= 2 ? "warning" : "info",
        "Your membership renews soon",
        `${member.plan} renews on ${formatDate(renewalDate)}.`
      ));
    }
  }

  if (member.paymentStatus !== "paid") {
    notifications.push(buildNotification(
      `member-payment-${member._id}`,
      "payment",
      member.paymentStatus === "unpaid" ? "warning" : "info",
      "Your membership payment needs attention",
      `Current payment status: ${member.paymentStatus}. Remaining balance: LKR ${calculateRemainingBalance(member).toLocaleString()}.`
    ));
  }

  const attendedToday = attendance.some((item) => item.member === member.name && (item.date === "Today" || daysBetween(new Date(), parseAttendanceDate(item.date) || new Date(0)) === 0));
  if (!attendedToday) {
    notifications.push(buildNotification(
      `member-checkin-${member._id}`,
      "missed-checkin",
      "warning",
      "No check-in recorded today",
      "Remember to check in when you arrive for your session."
    ));
  }

  return notifications;
}

function buildTrialEndingNotifications(gyms, prefix = "trial-ending") {
  const trialLengthDays = 14;
  const now = new Date();

  return gyms
    .filter((gym) => gym.status === "trial")
    .map((gym) => {
      const trialEnd = new Date(gym.joinedAt);
      trialEnd.setDate(trialEnd.getDate() + trialLengthDays);
      const daysLeft = daysBetween(now, trialEnd);

      if (daysLeft < 0 || daysLeft > 7) {
        return null;
      }

      return buildNotification(
        `${prefix}-${gym._id}`,
        "gym-trial",
        daysLeft <= 2 ? "warning" : "info",
        `${gym.name} trial ends soon`,
        `${gym.ownerName}'s gym is still on trial and reaches the default ${trialLengthDays}-day limit on ${formatDate(trialEnd)}.`,
        {
          gymId: String(gym._id),
          gymName: gym.name,
          ownerEmail: gym.ownerEmail
        }
      );
    })
    .filter(Boolean);
}

function buildSuspendedGymNotifications(gyms, prefix = "suspended-gym") {
  return gyms
    .filter((gym) => gym.status === "suspended")
    .map((gym) => buildNotification(
      `${prefix}-${gym._id}`,
      "gym-status",
      "warning",
      `${gym.name} is suspended`,
      `${gym.ownerName}'s gym is currently suspended and may need platform follow-up.`,
      {
        gymId: String(gym._id),
        gymName: gym.name,
        ownerEmail: gym.ownerEmail
      }
    ));
}

function buildPlatformPaymentRiskNotifications(gyms, members, prefix = "platform-payment") {
  return gyms
    .map((gym) => {
      const gymMembers = members.filter((member) => String(member.gym) === String(gym._id));
      const unpaidMembers = gymMembers.filter((member) => member.paymentStatus !== "paid");
      if (unpaidMembers.length < 3) {
        return null;
      }

      const totalOutstanding = unpaidMembers.reduce((sum, member) => sum + calculateRemainingBalance(member), 0);
      return buildNotification(
        `${prefix}-${gym._id}`,
        "payment-risk",
        unpaidMembers.length >= 5 ? "warning" : "info",
        `${gym.name} has growing unpaid subscriptions`,
        `${unpaidMembers.length} members in ${gym.name} still have pending subscription balances totaling LKR ${totalOutstanding.toLocaleString()}.`,
        {
          gymId: String(gym._id),
          gymName: gym.name,
          count: unpaidMembers.length
        }
      );
    })
    .filter(Boolean);
}

function buildPlatformExpiryRiskNotifications(gyms, members, prefix = "platform-expiry") {
  return gyms
    .map((gym) => {
      const expiredMembers = members.filter(
        (member) => String(member.gym) === String(gym._id) && member.status === "inactive" && member.planExpiresAt
      );

      if (expiredMembers.length < 3) {
        return null;
      }

      return buildNotification(
        `${prefix}-${gym._id}`,
        "membership-expiry",
        expiredMembers.length >= 5 ? "warning" : "info",
        `${gym.name} has many expired memberships`,
        `${expiredMembers.length} members in ${gym.name} are now inactive after their subscription expiry date.`,
        {
          gymId: String(gym._id),
          gymName: gym.name,
          count: expiredMembers.length
        }
      );
    })
    .filter(Boolean);
}

function buildInactiveGymNotifications(gyms, attendance, prefix = "inactive-gym") {
  const now = new Date();

  return gyms
    .map((gym) => {
      const gymAttendance = attendance.filter((item) => String(item.gym) === String(gym._id));
      if (gymAttendance.length === 0) {
        return buildNotification(
          `${prefix}-${gym._id}`,
          "gym-activity",
          "warning",
          `${gym.name} has no attendance activity`,
          `${gym.name} has no attendance records yet, which may mean the gym is not actively using the platform.`,
          {
            gymId: String(gym._id),
            gymName: gym.name
          }
        );
      }

      const latestSession = gymAttendance.reduce((latest, item) => {
        const candidate = item?.sessionDate ? new Date(item.sessionDate) : parseAttendanceDate(item.date);
        if (!candidate || Number.isNaN(candidate.getTime())) {
          return latest;
        }
        return !latest || candidate > latest ? candidate : latest;
      }, null);

      if (!latestSession) {
        return null;
      }

      const inactiveDays = daysBetween(latestSession, now);
      if (inactiveDays < 5) {
        return null;
      }

      return buildNotification(
        `${prefix}-${gym._id}`,
        "gym-activity",
        inactiveDays >= 10 ? "warning" : "info",
        `${gym.name} looks inactive`,
        `No attendance activity has been recorded for ${inactiveDays} days in ${gym.name}.`,
        {
          gymId: String(gym._id),
          gymName: gym.name,
          inactiveDays
        }
      );
    })
    .filter(Boolean);
}

function buildCoachDeleteSpikeNotifications(gyms, auditLogs, prefix = "coach-delete") {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return gyms
    .map((gym) => {
      const deleteCount = auditLogs.filter(
        (item) =>
          String(item.gym) === String(gym._id) &&
          item.actorRole === "coach" &&
          item.action === "delete" &&
          item.createdAt &&
          new Date(item.createdAt) >= sevenDaysAgo
      ).length;

      if (deleteCount < 2) {
        return null;
      }

      return buildNotification(
        `${prefix}-${gym._id}`,
        "audit-risk",
        deleteCount >= 4 ? "warning" : "info",
        `${gym.name} has repeated coach deletes`,
        `${deleteCount} coach delete actions were recorded in ${gym.name} during the last 7 days.`,
        {
          gymId: String(gym._id),
          gymName: gym.name,
          deleteCount
        }
      );
    })
    .filter(Boolean);
}

function asNumberArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "number") : fallback;
}

function normalizeMemberStats(stats, member) {
  const safeStats = stats && typeof stats === "object" ? stats : {};
  const weightFallback = member?.currentWeightKg != null ? [member.currentWeightKg] : [0];

  return {
    weight: asNumberArray(safeStats.weight, weightFallback),
    bodyFat: asNumberArray(safeStats.bodyFat, [0]),
    labels: Array.isArray(safeStats.labels) ? safeStats.labels : [],
    benchPress: asNumberArray(safeStats.benchPress, [0]),
    checkInsThisMonth: typeof safeStats.checkInsThisMonth === "number" ? safeStats.checkInsThisMonth : (member?.checkIns || 0),
    streak: typeof safeStats.streak === "number" ? safeStats.streak : 0,
    totalCheckIns: typeof safeStats.totalCheckIns === "number" ? safeStats.totalCheckIns : (member?.checkIns || 0)
  };
}

function mapGym(gym, memberCount, coachCount) {
  const latestRevenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
  return {
    id: gym._id,
    name: gym.name,
    owner: gym.ownerName,
    location: gym.location,
    members: memberCount,
    coaches: coachCount,
    status: gym.status,
    plan: gym.plan,
    joined: formatDate(gym.joinedAt),
    revenue: latestRevenue,
    ownerEmail: gym.ownerEmail
  };
}

function mapCoach(coach) {
  return {
    id: coach._id,
    name: coach.name,
    specialty: coach.specialty,
    members: coach.members,
    rating: coach.rating,
    status: coach.status,
    email: coach.email,
    certifications: coach.certifications || "",
    joined: formatDate(coach.joinedAt),
    avatar: coach.avatar,
    profileImageUrl: coach.profileImageUrl || ""
  };
}

function mapMember(member) {
  const remainingBalance = calculateRemainingBalance(member);
  return {
    id: member._id,
    name: member.name,
    coach: member.coach,
    plan: member.plan,
    subscriptionDurationMonths: member.subscriptionDurationMonths || 1,
    status: member.status,
    joined: formatDate(member.joinedAt),
    planStartedAt: member.planStartedAt ? formatDate(member.planStartedAt) : "",
    planExpiresAt: member.planExpiresAt ? formatDate(member.planExpiresAt) : "",
    checkIns: member.checkIns,
    goal: member.goal,
    heightCm: member.heightCm ?? null,
    emergencyContact: member.emergencyContact || "",
    paymentStatus: member.paymentStatus || "unpaid",
    amountPaid: Number(member.amountPaid || 0),
    amountDue: Number(member.amountDue || 0),
    remainingBalance,
    dietPlanName: member.dietPlanName || "",
    assignedWorkoutPlanName: member.myWorkoutPlan?.name || "",
    assignedMealPlanName: member.myMealPlan?.name || "",
    avatar: member.avatar,
    progress: member.progress,
    profileImageUrl: member.profileImageUrl || ""
  };
}

function mapAttendance(item) {
  return {
    id: item._id,
    memberId: item.memberId || null,
    member: item.member,
    coachName: item.coachName,
    avatar: item.avatar,
    profileImageUrl: item.profileImageUrl || "",
    time: item.time || formatTime(item.checkInAt),
    date: item.date || formatDate(item.sessionDate),
    checkInAt: item.checkInAt ? formatDateTime(item.checkInAt) : "",
    checkOutAt: item.checkOutAt ? formatDateTime(item.checkOutAt) : "",
    status: item.status || "checked-in"
  };
}

function mapAuditLog(item) {
  return {
    id: item._id,
    actorUser: item.actorUser || null,
    actorName: item.actorName,
    actorRole: item.actorRole,
    action: item.action,
    targetType: item.targetType,
    targetId: item.targetId || "",
    targetName: item.targetName || "",
    summary: item.summary,
    before: item.before ?? null,
    after: item.after ?? null,
    changedFields: Array.isArray(item.changedFields) ? item.changedFields : [],
    metadata: item.metadata ?? null,
    createdAt: item.createdAt ? formatDateTime(item.createdAt) : ""
  };
}

function buildFinancialSummary(gym, members, expenses, sales, returns) {
  const latestRevenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
  const membershipCollected = members.reduce((sum, member) => sum + Number(member.amountPaid || 0), 0);
  const outstandingPayments = members.reduce((sum, member) => {
    const due = Number(member.amountDue || 0) - Number(member.amountPaid || 0);
    return sum + Math.max(0, due);
  }, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const posSalesTotal = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const returnTotal = returns.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    membershipCollected,
    outstandingPayments,
    expenseTotal,
    posSalesTotal,
    returnTotal,
    monthlyRevenue: latestRevenue,
    netRevenue: latestRevenue + membershipCollected + posSalesTotal - expenseTotal - returnTotal,
    paidMembers: members.filter((member) => member.paymentStatus === "paid").length,
    nonPaidMembers: members.filter((member) => member.paymentStatus !== "paid").length
  };
}

function emptyOwnerDashboard() {
  return {
    profile: null,
    currentGym: {
      id: null,
      name: "No gym assigned yet",
      owner: "",
      stats: {
        totalMembers: 0,
        activeMembers: 0,
        coaches: 0,
        monthlyRevenue: 0,
        checkInsToday: 0,
        newThisMonth: 0
      }
    },
    notifications: [],
    coaches: [],
    members: [],
    pendingMemberRequests: [],
    equipment: [],
    membershipPlans: [],
    announcements: [],
    attendance: [],
    expenses: [],
    supplements: [],
    sales: [],
    returns: [],
    activityLogs: [],
    financials: {
      membershipCollected: 0,
      outstandingPayments: 0,
      expenseTotal: 0,
      posSalesTotal: 0,
      returnTotal: 0,
      monthlyRevenue: 0,
      netRevenue: 0,
      paidMembers: 0,
      nonPaidMembers: 0
    },
    revenueData: { months: [], values: [] }
  };
}

function emptyCoachDashboard() {
  return {
    profile: null,
    notifications: [],
    coach: null,
    members: [],
    workoutPlans: [],
    mealPlans: [],
    messages: [],
    attendance: []
  };
}

function emptyMemberDashboard() {
  return {
    profile: null,
    notifications: [],
    member: null,
    coach: null,
    messages: [],
    announcements: [],
    myWorkoutPlan: null,
    myMealPlan: null,
    myStats: null,
    attendance: []
  };
}

function buildUnlinkedCoachDashboard(user, gym) {
  return {
    ...emptyCoachDashboard(),
    profile: {
      role: "coach",
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      bio: user.bio || "",
      title: user.title || "Coach",
      profileImageUrl: user.profileImageUrl || "",
      gymName: gym?.name || "Not assigned",
      location: gym?.location || "",
      specialty: "",
      certifications: "",
      status: "inactive",
      joined: formatDate(user.createdAt),
      members: 0,
      rating: 0,
      avatar: "CO"
    }
  };
}

function buildUnlinkedMemberDashboard(user, gym) {
  return {
    ...emptyMemberDashboard(),
    profile: {
      role: "member",
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      bio: user.bio || "",
      title: user.title || "Member",
      profileImageUrl: user.profileImageUrl || "",
      gymName: gym?.name || "Not assigned",
      location: gym?.location || "",
      coach: "Not assigned",
      goal: "",
      plan: "",
      status: "pending",
      joined: formatDate(user.createdAt),
      heightCm: null,
      emergencyContact: "",
      currentWeightKg: null,
      targetWeightKg: null,
      targetBodyFat: null,
      personalNotes: "",
      bodyMeasurements: {
        chestCm: null,
        waistCm: null,
        armsCm: null,
        thighsCm: null
      },
      planExpiresAt: "",
      paymentStatus: "unpaid",
      amountPaid: 0,
      amountDue: 0,
      dietPlanName: ""
    }
  };
}

async function getDashboard(req, res) {
  const user = req.user;
  const role = user?.role;

  if (!user || !role) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (role === "super-admin") {
    await expireMembersByFilter(Member);

    const [gyms, coaches, members, attendance, auditLogs, ownerUsers] = await Promise.all([
      Gym.find().sort({ createdAt: 1 }).lean(),
      Coach.find().lean(),
      Member.find().lean(),
      Attendance.find().lean(),
      AuditLog.find({ actorRole: "coach" }).sort({ createdAt: -1 }).limit(500).lean(),
      User.find({ role: "owner" })
        .select("_id name email status lastLoginAt gym createdAt mustChangePassword")
        .sort({ createdAt: 1 })
        .lean()
    ]);

    const gymData = gyms.map((gym) => {
      const gymMembers = members.filter((member) => String(member.gym) === String(gym._id)).length;
      const gymCoaches = coaches.filter((coach) => String(coach.gym) === String(gym._id)).length;
      return mapGym(gym, gymMembers, gymCoaches);
    });

    const months = gyms[0]?.revenueHistory.map((point) => point.month) || [];
    const values = months.map((month) =>
      gyms.reduce((sum, gym) => sum + (gym.revenueHistory.find((point) => point.month === month)?.value || 0), 0)
    );
    const ownerByGymId = new Map(
      ownerUsers
        .filter((item) => item.gym)
        .map((item) => [String(item.gym), item])
    );
    const notifications = [
      ...buildTrialEndingNotifications(gyms, "admin-trial"),
      ...buildSuspendedGymNotifications(gyms, "admin-suspended"),
      ...buildPlatformPaymentRiskNotifications(gyms, members, "admin-payment"),
      ...buildPlatformExpiryRiskNotifications(gyms, members, "admin-expired"),
      ...buildInactiveGymNotifications(gyms, attendance, "admin-inactive"),
      ...buildCoachDeleteSpikeNotifications(gyms, auditLogs, "admin-audit")
    ]
      .sort((left, right) => {
        const severityRank = { warning: 0, info: 1, success: 2 };
        return (severityRank[left.severity] ?? 99) - (severityRank[right.severity] ?? 99);
      })
      .slice(0, 10);
    const owners = gyms.map((gym) => {
      const owner = ownerByGymId.get(String(gym._id)) || null;
      return {
        id: owner?._id || null,
        gymId: gym._id,
        gymName: gym.name,
        name: owner?.name || gym.ownerName,
        email: owner?.email || gym.ownerEmail,
        status: owner?.status || "missing",
        mustChangePassword: Boolean(owner?.mustChangePassword),
        lastLoginAt: owner?.lastLoginAt ? formatDateTime(owner.lastLoginAt) : "",
        createdAt: owner?.createdAt ? formatDateTime(owner.createdAt) : "",
        gymStatus: gym.status,
        plan: gym.plan
      };
    });
    const gymHealth = gyms.map((gym) => {
      const gymMembers = members.filter((member) => String(member.gym) === String(gym._id));
      const gymAttendance = attendance.filter((item) => String(item.gym) === String(gym._id));
      const unpaidMembers = gymMembers.filter((member) => member.paymentStatus !== "paid");
      const expiredMembers = gymMembers.filter((member) => member.status === "inactive" && member.planExpiresAt);
      const lastAttendance = gymAttendance.reduce((latest, item) => {
        const candidate = item?.sessionDate ? new Date(item.sessionDate) : parseAttendanceDate(item.date);
        if (!candidate || Number.isNaN(candidate.getTime())) {
          return latest;
        }
        return !latest || candidate > latest ? candidate : latest;
      }, null);
      const revenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
      return {
        gymId: gym._id,
        gymName: gym.name,
        plan: gym.plan,
        status: gym.status,
        members: gymMembers.length,
        activeMembers: gymMembers.filter((member) => member.status === "active").length,
        unpaidMembers: unpaidMembers.length,
        expiredMembers: expiredMembers.length,
        outstandingBalance: unpaidMembers.reduce((sum, member) => sum + calculateRemainingBalance(member), 0),
        coaches: coaches.filter((coach) => String(coach.gym) === String(gym._id)).length,
        revenue,
        lastAttendanceAt: lastAttendance ? formatDateTime(lastAttendance) : "",
        inactiveDays: lastAttendance ? daysBetween(lastAttendance, new Date()) : null
      };
    });
    const trials = gyms
      .filter((gym) => gym.status === "trial")
      .map((gym) => {
        const trialEnd = new Date(gym.joinedAt);
        trialEnd.setDate(trialEnd.getDate() + 14);
        return {
          gymId: gym._id,
          gymName: gym.name,
          ownerName: gym.ownerName,
          ownerEmail: gym.ownerEmail,
          joinedAt: formatDate(gym.joinedAt),
          trialEndsAt: formatDate(trialEnd),
          daysLeft: daysBetween(new Date(), trialEnd),
          plan: gym.plan
        };
      })
      .sort((left, right) => left.daysLeft - right.daysLeft);
    const platformAudit = auditLogs.map((item) => ({
      id: item._id,
      gymId: item.gym,
      gymName: gyms.find((gym) => String(gym._id) === String(item.gym))?.name || "Unknown Gym",
      actorName: item.actorName,
      actorRole: item.actorRole,
      action: item.action,
      targetType: item.targetType,
      targetName: item.targetName,
      summary: item.summary,
      createdAt: item.createdAt ? formatDateTime(item.createdAt) : ""
    }));

    return res.json({
      profile: {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Super Admin",
        profileImageUrl: user.profileImageUrl || "",
        joined: formatDate(user.createdAt)
      },
      notifications,
      superAdmin: {
        name: user.name,
        email: user.email,
        stats: {
          totalGyms: gyms.length,
          totalMembers: members.length,
          totalCoaches: coaches.length,
          monthlyRevenue: values[values.length - 1] || 0
        }
      },
      gyms: gymData,
      owners,
      gymHealth,
      trials,
      platformAudit,
      revenueData: { months, values }
    });
  }

  const gymId = user.gym;
  if (!gymId) {
    if (role === "owner") {
      return res.json(emptyOwnerDashboard());
    }

    if (role === "coach") {
      return res.json(emptyCoachDashboard());
    }

    if (role === "member") {
      return res.json(emptyMemberDashboard());
    }

    return res.status(400).json({ message: "User is not assigned to a gym" });
  }

  await expireMembersByFilter(Member, { gym: gymId });

  const [gym, coaches, members, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, gymUsers, auditLogs] =
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
      AuditLog.find({ gym: gymId, actorRole: "coach" }).sort({ createdAt: -1 }).limit(250).lean()
    ]);

  const userImageById = new Map(gymUsers.map((item) => [String(item._id), item.profileImageUrl || ""]));
  const pendingUsers = gymUsers.filter((item) => item.role === "member" && item.status === "pending");
  const membersWithImages = members.map((member) => ({
    ...member,
    profileImageUrl: userImageById.get(String(member.user)) || ""
  }));
  const coachesWithImages = coaches.map((coach) => ({
    ...coach,
    profileImageUrl: userImageById.get(String(coach.user)) || ""
  }));
  const memberImageByMemberId = new Map(
    membersWithImages.map((member) => [String(member._id), member.profileImageUrl || ""])
  );

  if (!gym) {
    if (role === "owner") {
      return res.json(emptyOwnerDashboard());
    }

    if (role === "coach") {
      return res.json(emptyCoachDashboard());
    }

    if (role === "member") {
      return res.json(emptyMemberDashboard());
    }

    return res.status(404).json({ message: "Gym not found" });
  }

  if (role === "owner") {
    const activeMembers = membersWithImages.filter((member) => member.status === "active").length;
    const latestRevenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
    const financials = buildFinancialSummary(gym, membersWithImages, expenses, sales, returns);
    const notifications = [
      ...buildAnnouncementNotifications(announcements, "owner-announcement"),
      ...buildExpiringPlanNotifications(membersWithImages, "owner-plan"),
      ...buildPendingPaymentNotifications(membersWithImages, "owner-payment"),
      ...buildMissedCheckInNotifications(membersWithImages, attendance, "owner-checkin"),
      ...buildEquipmentNotifications(equipment, "owner-equipment"),
      ...buildLowStockNotifications(supplements, "owner-supplement")
    ].slice(0, 12);

    return res.json({
      profile: {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Gym Owner",
        profileImageUrl: user.profileImageUrl || "",
        gymName: gym.name,
        location: gym.location,
        plan: gym.plan,
        joined: formatDate(gym.joinedAt)
      },
      notifications,
      currentGym: {
        id: gym._id,
        name: gym.name,
        owner: gym.ownerName,
        stats: {
          totalMembers: membersWithImages.length,
          activeMembers,
          coaches: coachesWithImages.length,
          monthlyRevenue: latestRevenue,
          checkInsToday: attendance.filter((item) => item.date === "Today" || formatDate(item.sessionDate) === formatDate(new Date())).length,
          newThisMonth: membersWithImages.filter((member) => new Date(member.joinedAt).getMonth() === new Date().getMonth()).length
        }
      },
      coaches: coachesWithImages.map(mapCoach),
      members: membersWithImages.map(mapMember),
      pendingMemberRequests: pendingUsers.map((item) => ({
        id: item._id,
        name: item.name,
        email: item.email,
        phone: item.phone || "",
        goal: item.requestedGoal || "",
        requestedAt: formatDate(item.createdAt)
      })),
      equipment: equipment.map((item) => ({
        id: item._id,
        name: item.name,
        qty: item.qty,
        status: item.status,
        lastService: formatDate(item.lastService)
      })),
      membershipPlans: plans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        durationMonths: plan.durationMonths || 1,
        price: plan.price,
        features: plan.features,
        color: plan.color
      })),
      announcements: announcements.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        date: formatDate(item.date),
        priority: item.priority
      })),
      attendance: attendance.map((item) =>
        mapAttendance({
          ...item,
          profileImageUrl: memberImageByMemberId.get(String(item.memberId || "")) || ""
        })
      ),
      expenses: expenses.map((item) => ({
        id: item._id,
        title: item.title,
        category: item.category,
        amount: item.amount,
        status: item.status,
        vendor: item.vendor,
        notes: item.notes,
        expenseDate: formatDate(item.expenseDate)
      })),
      supplements: supplements.map((item) => ({
        id: item._id,
        name: item.name,
        sku: item.sku,
        brand: item.brand,
        category: item.category,
        imageUrl: item.imageUrl || "",
        stockQty: item.stockQty,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        status: item.status
      })),
      sales: sales.map((item) => ({
        id: item._id,
        customerName: item.customerName,
        memberName: item.memberName,
        paymentMethod: item.paymentMethod,
        status: item.status,
        subtotal: item.subtotal,
        total: item.total,
        returnAmount: item.returnAmount,
        soldAt: formatDate(item.soldAt),
        items: item.items
      })),
      returns: returns.map((item) => ({
        id: item._id,
        saleId: item.sale,
        customerName: item.customerName,
        reason: item.reason,
        amount: item.amount,
        processedAt: formatDate(item.processedAt),
        items: item.items
      })),
      activityLogs: auditLogs.map(mapAuditLog),
      financials,
      revenueData: {
        months: gym.revenueHistory.map((point) => point.month),
        values: gym.revenueHistory.map((point) => point.value)
      }
    });
  }

  if (role === "coach") {
    const coach = coachesWithImages.find((item) => String(item.user) === String(user._id));
    if (!coach) {
      return res.json(buildUnlinkedCoachDashboard(user, gym));
    }

    const myMembers = membersWithImages.filter((member) => member.coach === coach?.name);
    const myMessages = messages.filter((message) => message.coachName === coach?.name);
    const myAttendance = attendance.filter((item) => item.coachName === coach?.name);
    const notifications = [
      ...buildAnnouncementNotifications(announcements, "coach-announcement"),
      ...buildPendingPaymentNotifications(myMembers, "coach-payment"),
      ...buildMissedCheckInNotifications(myMembers, myAttendance, "coach-checkin")
    ].slice(0, 10);

    return res.json({
      profile: coach ? {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Coach",
        profileImageUrl: user.profileImageUrl || "",
        gymName: gym.name,
        location: gym.location,
        specialty: coach.specialty,
        certifications: coach.certifications || "",
        status: coach.status,
        joined: formatDate(coach.joinedAt),
        members: coach.members,
        rating: coach.rating,
        avatar: coach.avatar
      } : null,
      notifications,
      coach: coach ? mapCoach(coach) : null,
      members: myMembers.map(mapMember),
      workoutPlans: workoutPlans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        level: plan.level,
        duration: plan.duration,
        days: plan.days,
        category: plan.category
      })),
      mealPlans: mealPlans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        calories: plan.calories,
        protein: plan.protein,
        carbs: plan.carbs,
        fat: plan.fat,
        goal: plan.goal,
        meals: Array.isArray(plan.meals) ? plan.meals : []
      })),
      messages: myMessages.map((message) => ({
        id: message._id,
        from: message.from,
        avatar: message.avatar,
        profileImageUrl:
          userImageById.get(String(message.senderUser || "")) ||
          (message.senderRole === "member"
            ? (myMembers.find((member) => member.name === message.memberName)?.profileImageUrl || "")
            : (coach?.profileImageUrl || "")),
        text: message.text,
        time: message.time,
        unread: message.unread,
        senderRole: message.senderRole || (message.from === coach?.name ? "coach" : "member"),
        recipientRole: message.recipientRole || (message.from === coach?.name ? "member" : "coach"),
        memberName: message.memberName,
        coachName: message.coachName,
        createdAt: message.createdAt ? formatDateTime(message.createdAt) : ""
      })),
      attendance: myAttendance.map((item) =>
        mapAttendance({
          ...item,
          profileImageUrl: memberImageByMemberId.get(String(item.memberId || "")) || ""
        })
      )
    });
  }

  if (role === "member") {
    const member = membersWithImages.find((item) => String(item.user) === String(user._id));
    if (!member) {
      return res.json(buildUnlinkedMemberDashboard(user, gym));
    }

    const coach = coachesWithImages.find((item) => item.name === member?.coach);
    const myAttendance = attendance.filter((item) => String(item.memberId || "") === String(member?._id || "") || item.member === member?.name);
    const notifications = member ? buildMemberNotifications(member, announcements, attendance).slice(0, 10) : [];
      const renewalDate = member ? getNextPlanRenewal(member) : null;
      const remainingBalance = member ? calculateRemainingBalance(member) : 0;

    return res.json({
      profile: member ? {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Member",
        profileImageUrl: user.profileImageUrl || "",
        gymName: gym.name,
        location: gym.location,
        coach: coach?.name || "Not assigned",
        goal: member.goal,
        plan: member.plan,
        status: member.status,
        joined: formatDate(member.joinedAt),
        heightCm: member.heightCm ?? null,
        emergencyContact: member.emergencyContact || "",
        currentWeightKg: member.currentWeightKg ?? null,
        targetWeightKg: member.targetWeightKg ?? null,
        targetBodyFat: member.targetBodyFat ?? null,
        personalNotes: member.personalNotes || "",
        bodyMeasurements: {
          chestCm: member.bodyMeasurements?.chestCm ?? null,
          waistCm: member.bodyMeasurements?.waistCm ?? null,
          armsCm: member.bodyMeasurements?.armsCm ?? null,
          thighsCm: member.bodyMeasurements?.thighsCm ?? null
        },
        planExpiresAt: renewalDate ? formatDate(renewalDate) : "",
        paymentStatus: member.paymentStatus || "unpaid",
        amountPaid: Number(member.amountPaid || 0),
        amountDue: Number(member.amountDue || 0),
        remainingBalance,
        dietPlanName: member.dietPlanName || ""
      } : null,
      notifications,
      member: member ? mapMember(member) : null,
      coach: coach ? mapCoach(coach) : null,
      messages: messages
        .filter((message) => String(message.memberUser || "") === String(user._id) || message.memberName === member?.name)
        .map((message) => ({
          id: message._id,
          from: message.from,
          avatar: message.avatar,
          profileImageUrl:
            userImageById.get(String(message.senderUser || "")) ||
            (message.senderRole === "coach"
              ? (coach?.profileImageUrl || "")
              : (member?.profileImageUrl || "")),
          text: message.text,
          time: message.time,
          unread: message.unread,
          senderRole: message.senderRole || (message.from === coach?.name ? "coach" : "member"),
          recipientRole: message.recipientRole || (message.from === coach?.name ? "member" : "coach"),
          memberName: message.memberName,
          coachName: message.coachName,
          createdAt: message.createdAt ? formatDateTime(message.createdAt) : ""
        })),
      announcements: announcements.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        date: formatDate(item.date),
        priority: item.priority
      })),
      myWorkoutPlan: member?.myWorkoutPlan || null,
      myMealPlan: member?.myMealPlan || null,
      myStats: member ? normalizeMemberStats(member.myStats, member) : null,
      attendance: myAttendance.map((item) =>
        mapAttendance({
          ...item,
          profileImageUrl: memberImageByMemberId.get(String(item.memberId || "")) || ""
        })
      )
    });
  }

  return res.status(400).json({ message: "Unsupported role" });
}

module.exports = {
  getDashboard
};
