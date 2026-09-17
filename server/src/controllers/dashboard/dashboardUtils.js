function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function formatDateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d.toISOString();
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
        `${member.name}'s subscription is ending soon`,
        `${member.plan} ends on ${formatDate(renewalDate)}.`,
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
      const nextServiceDate = item.nextServiceDate ? new Date(item.nextServiceDate) : new Date(lastService.getFullYear(), lastService.getMonth() + 3, lastService.getDate());
      const daysSinceService = Math.round((now.getTime() - lastService.getTime()) / 86400000);
      const daysUntilNextService = Math.round((nextServiceDate.getTime() - now.getTime()) / 86400000);
      const needsAttention = item.status !== "good" || daysSinceService >= 90 || daysUntilNextService <= 7;

      if (!needsAttention) {
        return null;
      }

      return buildNotification(
        `${prefix}-${item._id}`,
        "equipment-service",
        item.status === "replace" ? "warning" : "info",
        `${item.name} needs service follow-up`,
        `Status is ${item.status}, last service was ${formatDate(item.lastService)}, and next service is due ${formatDate(nextServiceDate)}.`,
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
        "Your subscription is ending soon",
        `${member.plan} ends on ${formatDate(renewalDate)}.`
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

function mapGym(gym, memberCount, coachCount, subPlanName) {
  const latestRevenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
  return {
    id: gym._id,
    name: gym.name,
    owner: gym.ownerName,
    location: gym.location,
    phone: gym.phone || "",
    website: gym.website || "",
    facebookUrl: gym.facebookUrl || "",
    googleMapsUrl: gym.googleMapsUrl || "",
    brNumber: gym.brNumber || "",
    logoUrl: gym.logoUrl || "",
    description: gym.description || "",
    members: memberCount,
    coaches: coachCount,
    status: gym.status,
    plan: gym.plan,
    joined: formatDate(gym.joinedAt),
    trialEndsAt: formatDate(gym.trialEndsAt),
    subscriptionPlanId: gym.subscriptionPlanId ? String(gym.subscriptionPlanId) : null,
    subscriptionPlanName: subPlanName || "",
    subscriptionStartedAt: formatDate(gym.subscriptionStartedAt),
    subscriptionEndsAt: formatDate(gym.subscriptionEndsAt),
    revenue: latestRevenue,
    ownerEmail: gym.ownerEmail
  };
}

function mapCoach(coach) {
  return {
    id: coach._id,
    coachCode: coach.coachCode || "",
    name: coach.name,
    specialty: coach.specialty,
    members: coach.members,
    status: coach.status,
    email: coach.email,
    certifications: coach.certifications || "",
    dateOfBirth: coach.dateOfBirth ? formatDate(coach.dateOfBirth) : "",
    gender: coach.gender || "",
    address: coach.address || "",
    nationalId: coach.nationalId || "",
    employeeCode: coach.employeeCode || "",
    hireDate: coach.hireDate ? formatDate(coach.hireDate) : "",
    employmentType: coach.employmentType || "",
    baseSalary: Number(coach.baseSalary) || 0,
    salaryModel: coach.salaryModel || "",
    shiftSchedule: coach.shiftSchedule || "",
    specializations: Array.isArray(coach.specializations) ? coach.specializations : [],
    yearsOfExperience: coach.yearsOfExperience ?? null,
    languages: Array.isArray(coach.languages) ? coach.languages : [],
    certificationExpiryDates: Array.isArray(coach.certificationExpiryDates) ? coach.certificationExpiryDates : [],
    availableHours: coach.availableHours || "",
    maxClientCapacity: coach.maxClientCapacity ?? null,
    performanceNotes: coach.performanceNotes || "",
    bankPaymentDetails: coach.bankPaymentDetails || "",
    emergencyContact: coach.emergencyContact || "",
    documents: Array.isArray(coach.documents) ? coach.documents : [],
    joined: formatDate(coach.joinedAt),
    avatar: coach.avatar,
    profileImageUrl: coach.profileImageUrl || "",
    phone: coach.phone || ""
  };
}

function mapMember(member) {
  const remainingBalance = calculateRemainingBalance(member);
  return {
    id: member._id,
    memberCode: member.memberCode || "",
    name: member.name,
    email: member.email || "",
    coach: member.coach,
    plan: member.plan,
    subscriptionDurationMonths: member.subscriptionDurationMonths || 1,
    status: member.status,
    joined: formatDate(member.joinedAt),
    planStartedAt: member.planStartedAt ? formatDate(member.planStartedAt) : "",
    planExpiresAt: member.planExpiresAt ? formatDate(member.planExpiresAt) : "",
    checkIns: member.checkIns,
    goal: member.goal,
    dateOfBirth: member.dateOfBirth ? formatDate(member.dateOfBirth) : "",
    gender: member.gender || "",
    address: member.address || "",
    medicalNotes: member.medicalNotes || "",
    fitnessLevel: member.fitnessLevel || "",
    preferredWorkoutTime: member.preferredWorkoutTime || "",
    heightCm: member.heightCm ?? null,
    emergencyContact: member.emergencyContact || "",
    emergencyContactRelationship: member.emergencyContactRelationship || "",
    paymentStatus: member.paymentStatus || "unpaid",
    amountPaid: Number(member.amountPaid || 0),
    amountDue: Number(member.amountDue || 0),
    joinSource: member.joinSource || "",
    renewalReminderPreference: member.renewalReminderPreference || "",
    attendanceNotes: member.attendanceNotes || "",
    assignedLocker: member.assignedLocker || "",
    memberTag: member.memberTag || "",
    barcode: member.barcode || "",
    progressPhotos: Array.isArray(member.progressPhotos) ? member.progressPhotos : [],
    bodyFatPercentage: member.bodyFatPercentage ?? null,
    bmi: member.bmi ?? null,
    waistToHipRatio: member.waistToHipRatio ?? null,
    supplementUsage: member.supplementUsage || "",
    paymentMethod: member.paymentMethod || "",
    membershipFreezeStatus: member.membershipFreezeStatus || "",
    goalTargetDate: member.goalTargetDate ? formatDate(member.goalTargetDate) : "",
    remainingBalance,
    dietPlanName: member.dietPlanName || "",
    assignedWorkoutPlanName: member.myWorkoutPlan?.name || "",
    assignedMealPlanName: member.myMealPlan?.name || "",
    avatar: member.avatar,
    progress: member.progress,
    profileImageUrl: member.profileImageUrl || "",
    phone: member.phone || ""
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
  const expenseTotal = expenses.filter((item) => item.type !== "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const otherIncomeTotal = expenses.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const posSalesTotal = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const returnTotal = returns.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    membershipCollected,
    outstandingPayments,
    otherIncomeTotal,
    expenseTotal,
    posSalesTotal,
    returnTotal,
    monthlyRevenue: latestRevenue,
    netRevenue: latestRevenue + membershipCollected + otherIncomeTotal + posSalesTotal - expenseTotal - returnTotal,
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
      otherIncomeTotal: 0,
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
      coachCode: "",
      gymName: gym?.name || "Not assigned",
      location: gym?.location || "",
      specialty: "",
      certifications: "",
      status: "inactive",
      joined: formatDate(user.createdAt),
      members: 0,
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
      memberCode: "",
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

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  parseAttendanceDate,
  startOfDay,
  daysBetween,
  getNextPlanRenewal,
  calculateRemainingBalance,
  buildNotification,
  buildAnnouncementNotifications,
  buildExpiringPlanNotifications,
  buildEquipmentNotifications,
  buildMissedCheckInNotifications,
  buildLowStockNotifications,
  buildPendingPaymentNotifications,
  buildMemberNotifications,
  buildTrialEndingNotifications,
  buildSuspendedGymNotifications,
  buildPlatformPaymentRiskNotifications,
  buildPlatformExpiryRiskNotifications,
  buildInactiveGymNotifications,
  buildCoachDeleteSpikeNotifications,
  asNumberArray,
  normalizeMemberStats,
  mapGym,
  mapCoach,
  mapMember,
  mapAttendance,
  mapAuditLog,
  buildFinancialSummary,
  emptyOwnerDashboard,
  emptyCoachDashboard,
  emptyMemberDashboard,
  buildUnlinkedCoachDashboard,
  buildUnlinkedMemberDashboard
};
