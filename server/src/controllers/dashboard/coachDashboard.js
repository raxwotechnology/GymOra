const Coach = require("../../models/Coach");
const CoachAttendance = require("../../models/CoachAttendance");
const SalaryAdvance = require("../../models/SalaryAdvance");
const MembershipPlan = require("../../models/MembershipPlan");
const { formatDate, formatDateTime, mapCoach, mapMember, mapAttendance, buildAnnouncementNotifications, buildPendingPaymentNotifications, buildMissedCheckInNotifications, buildUnlinkedCoachDashboard } = require("./dashboardUtils");

async function handleCoach(req, res, sharedData) {
  const { gym, coaches: coachesWithImages, members: membersWithImages, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, pendingUsers, auditLogs, memberImageByMemberId, user } = sharedData;
  const role = user.role;

  const coach =
      coachesWithImages.find((item) => String(item.user) === String(user._id)) ||
      coachesWithImages.find((item) => String(item._id) === String(user.coachProfile || "")) ||
      coachesWithImages.find((item) => String(item.email || "").toLowerCase() === String(user.email || "").toLowerCase() && String(item.gym || "") === String(user.gym || ""));
    if (!coach) {
      return res.json(buildUnlinkedCoachDashboard(user, gym));
    }

    const myMembers = membersWithImages.filter((member) => member.coach === coach?.name);
    const myMessages = messages.filter((message) => message.coachName === coach?.name);
    const myAttendance = attendance.filter((item) => item.coachName === coach?.name);
    const visibleAnnouncements = announcements.filter((a) => {
      if (!a.audience || a.audience === "all" || a.audience === "coaches") return true;
      if (a.audience === "specific") {
        return a.targetCoachIds && a.targetCoachIds.some((id) => String(id) === String(coach._id));
      }
      return false;
    });
    const notifications = [
      ...buildAnnouncementNotifications(visibleAnnouncements, "coach-announcement"),
      ...buildPendingPaymentNotifications(myMembers, "coach-payment"),
      ...buildMissedCheckInNotifications(myMembers, myAttendance, "coach-checkin")
    ].slice(0, 10);

    const coachDoc = await Coach.findOne({ user: user._id, gym: user.gym }).lean();
    const coachId = coachDoc?._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [myCoachAttendance, mySalaryAdvances, todayCoachRecord] = await Promise.all([
      coachId ? CoachAttendance.find({ coach: coachId }).sort({ date: -1 }).limit(60).lean() : Promise.resolve([]),
      coachId ? SalaryAdvance.find({ coach: coachId }).sort({ date: -1 }).lean() : Promise.resolve([]),
      coachId ? CoachAttendance.findOne({ coach: coachId, date: { $gte: today } }).sort({ createdAt: -1 }).lean() : Promise.resolve(null)
    ]);

    const { userImageById } = sharedData;

    return res.json({
      readNotificationIds: Array.isArray(user.readNotificationIds) ? user.readNotificationIds : [],
      profile: coach ? {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Coach",
        profileImageUrl: user.profileImageUrl || "",
        coachCode: coach.coachCode || "",
        gymName: gym.name,
        location: gym.location,
        specialty: coach.specialty,
        certifications: coach.certifications || "",
        dateOfBirth: coach.dateOfBirth ? formatDate(coach.dateOfBirth) : "",
        gender: coach.gender || "",
        address: coach.address || "",
        nationalId: coach.nationalId || "",
        employeeCode: coach.employeeCode || "",
        hireDate: coach.hireDate ? formatDate(coach.hireDate) : "",
        employmentType: coach.employmentType || "",
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
        status: coach.status,
        joined: formatDate(coach.joinedAt),
        members: coach.members,
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
        category: plan.category,
        description: plan.description || "",
        exercises: Array.isArray(plan.exercises) ? plan.exercises : []
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
      ),
      coachAttendance: myCoachAttendance.map((r) => ({
        id: r._id,
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
        clockIn: r.clockIn || null,
        clockOut: r.clockOut || null,
        breakStart: r.breakStart || null,
        breakEnd: r.breakEnd || null,
        totalWorkMinutes: r.totalWorkMinutes || 0,
        breakMinutes: r.breakMinutes || 0,
        status: r.status
      })),
      todayCoachAttendance: todayCoachRecord ? {
        id: todayCoachRecord._id,
        date: todayCoachRecord.date,
        clockIn: todayCoachRecord.clockIn,
        clockOut: todayCoachRecord.clockOut,
        breakStart: todayCoachRecord.breakStart,
        breakEnd: todayCoachRecord.breakEnd,
        totalWorkMinutes: todayCoachRecord.totalWorkMinutes || 0,
        breakMinutes: todayCoachRecord.breakMinutes || 0,
        status: todayCoachRecord.status
      } : null,
      salaryAdvances: mySalaryAdvances.map((adv) => ({
        id: adv._id,
        amount: adv.amount,
        date: adv.date ? new Date(adv.date).toISOString().slice(0, 10) : "",
        reason: adv.reason || "",
        status: adv.status,
        note: adv.note || ""
      })),
      membershipPlans: (await MembershipPlan.find({ gym: user.gym }).lean()).map((p) => ({
        id: p._id,
        name: p.name,
        durationMonths: p.durationMonths,
        price: p.price
      }))
    });
}

module.exports = { handleCoach };
