const { formatDate, formatDateTime, mapCoach, mapMember, mapAttendance, buildMemberNotifications, getNextPlanRenewal, calculateRemainingBalance, normalizeMemberStats, buildUnlinkedMemberDashboard } = require("./dashboardUtils");

async function handleMember(req, res, sharedData) {
  const { gym, coaches: coachesWithImages, members: membersWithImages, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, pendingUsers, auditLogs, memberImageByMemberId, user } = sharedData;
  const role = user.role;

  const member =
      membersWithImages.find((item) => String(item.user) === String(user._id)) ||
      membersWithImages.find((item) => String(item._id) === String(user.memberProfile || "")) ||
      membersWithImages.find((item) => item.name === user.name && String(item.gym || "") === String(user.gym || ""));
    if (!member) {
      return res.json(buildUnlinkedMemberDashboard(user, gym));
    }

    const coach = coachesWithImages.find((item) => item.name === member?.coach);
    const myAttendance = attendance.filter((item) => String(item.memberId || "") === String(member?._id || "") || item.member === member?.name);
    const visibleAnnouncements = announcements.filter((a) => {
      if (!a.audience || a.audience === "all" || a.audience === "members") return true;
      if (a.audience === "specific") {
        return a.targetMemberIds && a.targetMemberIds.some((id) => String(id) === String(member._id));
      }
      return false;
    });
    const notifications = member ? buildMemberNotifications(member, visibleAnnouncements, attendance).slice(0, 10) : [];
      const renewalDate = member ? getNextPlanRenewal(member) : null;
      const remainingBalance = member ? calculateRemainingBalance(member) : 0;

    const { userImageById } = sharedData;

    return res.json({
      readNotificationIds: Array.isArray(user.readNotificationIds) ? user.readNotificationIds : [],
      profile: member ? {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Member",
        profileImageUrl: user.profileImageUrl || "",
        memberCode: member.memberCode || "",
        gymName: gym.name,
        location: gym.location,
        coach: coach?.name || "Not assigned",
        goal: member.goal,
        dateOfBirth: member.dateOfBirth ? formatDate(member.dateOfBirth) : "",
        gender: member.gender || "",
        address: member.address || "",
        medicalNotes: member.medicalNotes || "",
        fitnessLevel: member.fitnessLevel || "",
        preferredWorkoutTime: member.preferredWorkoutTime || "",
        plan: member.plan,
        status: member.status,
        joined: formatDate(member.joinedAt),
        heightCm: member.heightCm ?? null,
        emergencyContact: member.emergencyContact || "",
        emergencyContactRelationship: member.emergencyContactRelationship || "",
        currentWeightKg: member.currentWeightKg ?? null,
        targetWeightKg: member.targetWeightKg ?? null,
        targetBodyFat: member.targetBodyFat ?? null,
        bodyFatPercentage: member.bodyFatPercentage ?? null,
        bmi: member.bmi ?? null,
        waistToHipRatio: member.waistToHipRatio ?? null,
        personalNotes: member.personalNotes || "",
        joinSource: member.joinSource || "",
        renewalReminderPreference: member.renewalReminderPreference || "",
        attendanceNotes: member.attendanceNotes || "",
        assignedLocker: member.assignedLocker || "",
        memberTag: member.memberTag || "",
        barcode: member.barcode || "",
        progressPhotos: Array.isArray(member.progressPhotos) ? member.progressPhotos : [],
        supplementUsage: member.supplementUsage || "",
        paymentMethod: member.paymentMethod || "",
        membershipFreezeStatus: member.membershipFreezeStatus || "",
        goalTargetDate: member.goalTargetDate ? formatDate(member.goalTargetDate) : "",
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
      announcements: visibleAnnouncements.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        date: formatDate(item.date),
        priority: item.priority
      })),
      myWorkoutPlan: member?.myWorkoutPlan || null,
      myMealPlan: member?.myMealPlan || null,
      workoutHistory: Array.isArray(member?.workoutHistory)
        ? member.workoutHistory.slice(-90).reverse().map((entry) => ({
          date: formatDate(entry.date),
          planName: entry.planName || "",
          day: entry.day || "",
          exercises: Array.isArray(entry.exercises) ? entry.exercises.map((e) => ({
            name: e.name || "",
            sets: e.sets || null,
            reps: e.reps || "",
            done: Boolean(e.done),
            loggedWeight: e.loggedWeight || "",
            completionNotes: e.completionNotes || ""
          })) : []
        }))
        : [],
      myStats: member ? normalizeMemberStats(member.myStats, member) : null,
      paymentHistory: Array.isArray(member?.paymentHistory)
        ? member.paymentHistory.map((rec) => ({
          date: rec.date ? formatDate(rec.date) : "",
          amount: Number(rec.amount || 0),
          method: rec.method || "",
          planName: rec.planName || "",
          months: Number(rec.months || 1),
          note: rec.note || ""
        })).reverse()
        : [],
      attendance: myAttendance.map((item) =>
        mapAttendance({
          ...item,
          profileImageUrl: memberImageByMemberId.get(String(item.memberId || "")) || ""
        })
      )
    });
}

module.exports = { handleMember };
