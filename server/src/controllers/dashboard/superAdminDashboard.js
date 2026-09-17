const Gym = require("../../models/Gym");
const User = require("../../models/User");
const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const Attendance = require("../../models/Attendance");
const AuditLog = require("../../models/AuditLog");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const BankDetail = require("../../models/BankDetail");
const SystemSettings = require("../../models/SystemSettings");
const { expireMembersByFilter } = require("../../utils/subscription");
const { formatDate, formatDateTime, mapGym, buildTrialEndingNotifications, buildSuspendedGymNotifications, buildPlatformPaymentRiskNotifications, buildPlatformExpiryRiskNotifications, buildInactiveGymNotifications, buildCoachDeleteSpikeNotifications, calculateRemainingBalance, daysBetween, parseAttendanceDate } = require("./dashboardUtils");

async function handleSuperAdmin(req, res) {
  const user = req.user;
  const role = user?.role;

  await expireMembersByFilter(Member);

    const [gyms, coaches, members, attendance, auditLogs, ownerUsers, subscriptionPlans, bankDetails, systemSettings] = await Promise.all([
      Gym.find().sort({ createdAt: 1 }).lean(),
      Coach.find().lean(),
      Member.find().lean(),
      Attendance.find().lean(),
      AuditLog.find({ actorRole: "coach" }).sort({ createdAt: -1 }).limit(500).lean(),
      User.find({ role: "owner" })
        .select("_id name email status lastLoginAt gym createdAt mustChangePassword")
        .sort({ createdAt: 1 })
        .lean(),
      SubscriptionPlan.find().sort({ price: 1 }).lean(),
      BankDetail.find().sort({ isDefault: -1, createdAt: -1 }).lean(),
      SystemSettings.getSingleton()
    ]);

    const subPlanMap = new Map(subscriptionPlans.map((p) => [String(p._id), p.name]));

    const gymData = gyms.map((gym) => {
      const gymMembers = members.filter((member) => String(member.gym) === String(gym._id)).length;
      const gymCoaches = coaches.filter((coach) => String(coach.gym) === String(gym._id)).length;
      const subPlanName = gym.subscriptionPlanId ? (subPlanMap.get(String(gym.subscriptionPlanId)) || "") : "";
      return mapGym(gym, gymMembers, gymCoaches, subPlanName);
    });

    // build multi-owner map: gymId -> [ownerUser, ...]
    const gymOwnersMap = {};
    for (const ownerUser of ownerUsers) {
      if (!ownerUser.gym) continue;
      const gid = String(ownerUser.gym);
      if (!gymOwnersMap[gid]) gymOwnersMap[gid] = [];
      gymOwnersMap[gid].push({
        id: ownerUser._id,
        name: ownerUser.name,
        email: ownerUser.email,
        status: ownerUser.status,
        lastLoginAt: ownerUser.lastLoginAt ? formatDateTime(ownerUser.lastLoginAt) : "",
        mustChangePassword: Boolean(ownerUser.mustChangePassword)
      });
    }

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
        if (!candidate || Number.isNaN(candidate.getTime())) return latest;
        return !latest || candidate > latest ? candidate : latest;
      }, null);
      const revenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
      const joinedDate = new Date(gym.joinedAt);
      const now = new Date();
      const monthsOnPlatform = Math.max(0, (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth()));
      const subPlanName = gym.subscriptionPlanId ? (subPlanMap.get(String(gym.subscriptionPlanId)) || "") : "";
      const paymentHistory = (gym.subscriptionBillingHistory || []).slice(-5).map((e) => ({
        date: formatDate(e.date),
        amount: e.amount,
        note: e.note,
        method: e.method
      }));
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
        inactiveDays: lastAttendance ? daysBetween(lastAttendance, now) : null,
        monthsOnPlatform,
        subscriptionPlanName: subPlanName,
        subscriptionStartedAt: formatDate(gym.subscriptionStartedAt),
        subscriptionEndsAt: formatDate(gym.subscriptionEndsAt),
        paymentHistory,
        joinedAt: formatDate(gym.joinedAt)
      };
    });
    const trials = gyms
      .filter((gym) => gym.status === "trial")
      .map((gym) => {
        const trialEnd = gym.trialEndsAt ? new Date(gym.trialEndsAt) : (() => {
          const d = new Date(gym.joinedAt);
          d.setDate(d.getDate() + 14);
          return d;
        })();
        return {
          gymId: gym._id,
          gymName: gym.name,
          ownerName: gym.ownerName,
          ownerEmail: gym.ownerEmail,
          joinedAt: formatDate(gym.joinedAt),
          trialEndsAt: formatDate(trialEnd),
          daysLeft: daysBetween(new Date(), trialEnd),
          plan: gym.plan,
          subscriptionPlanName: gym.subscriptionPlanId ? (subPlanMap.get(String(gym.subscriptionPlanId)) || "") : ""
        };
      })
      .sort((left, right) => left.daysLeft - right.daysLeft);

    // subscription ending soon alerts (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subscriptionEndingAlerts = gyms
      .filter((gym) => gym.subscriptionEndsAt && new Date(gym.subscriptionEndsAt) <= sevenDaysFromNow && new Date(gym.subscriptionEndsAt) >= now)
      .map((gym) => {
        const endsAt = new Date(gym.subscriptionEndsAt);
        const daysLeft = daysBetween(now, endsAt);
        return {
          gymId: gym._id,
          gymName: gym.name,
          ownerEmail: gym.ownerEmail,
          subscriptionPlanName: gym.subscriptionPlanId ? (subPlanMap.get(String(gym.subscriptionPlanId)) || "") : "",
          subscriptionEndsAt: formatDate(gym.subscriptionEndsAt),
          daysLeft
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
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
      readNotificationIds: Array.isArray(user.readNotificationIds) ? user.readNotificationIds : [],
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
      gymOwnersMap,
      gymHealth,
      trials,
      subscriptionEndingAlerts,
      platformAudit,
      revenueData: { months, values },
      subscriptionPlans,
      bankDetails,
      systemSettings: {
        systemName: systemSettings.systemName || "FitnessHub",
        tagline: systemSettings.tagline || "Gym Management Platform",
        logoUrl: systemSettings.logoUrl || "",
        heroImageUrl: systemSettings.heroImageUrl || "",
        primaryColor: systemSettings.primaryColor || "#2563eb",
        supportEmail: systemSettings.supportEmail || "",
        trialDays: systemSettings.trialDays || 14,
        privacyPolicy: systemSettings.privacyPolicy || "",
        termsOfUse: systemSettings.termsOfUse || "",
        helpCenter: systemSettings.helpCenter || ""
      }
    });
}

module.exports = { handleSuperAdmin };
