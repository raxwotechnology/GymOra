const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const MembershipPlan = require("../../models/MembershipPlan");
const User = require("../../models/User");
const Gym = require("../../models/Gym");
const { sendSms } = require("../../utils/sms");
const {
  avatarFromName, normalizeEmail, parseDateOrNull, parseNumberOrNull, parseStringList,
  canManageGym, findOwnedDocument, resolveMembershipPlan, addMonths, normalizeCurrencyAmount,
  resolveSubscriptionDuration, resolveSubscriptionCharge, derivePaymentStatus, resolveSubscriptionDates,
  logCoachActivity
} = require("./ownerUtils");
const { hashPassword, generateTemporaryPassword } = require("../../utils/password");
const { buildMemberCode } = require("../../utils/entityCodes");
const { deriveSubscriptionStatus } = require("../../utils/subscription");

async function createMember(req, res) {
  const {
    gymId, name, coach, plan, goal, email, subscriptionDurationMonths,
    amountPaid, amountDue, dietPlanName, dateOfBirth, gender, address, medicalNotes,
    fitnessLevel, preferredWorkoutTime, emergencyContact, emergencyContactRelationship,
    joinSource, renewalReminderPreference, attendanceNotes, assignedLocker, memberTag,
    barcode, progressPhotos, bodyFatPercentage, bmi, waistToHipRatio, supplementUsage,
    paymentMethod, membershipFreezeStatus, goalTargetDate, heightCm, currentWeightKg,
    targetWeightKg, targetBodyFat, personalNotes, chestCm, waistCm, armsCm, thighsCm
  } = req.body || {};

  if (!gymId || !name || !plan || !goal || !email) {
    return res.status(400).json({ message: "gymId, name, plan, goal, and email are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  let resolvedCoach = coach;
  if (req.user?.role === "coach" && !resolvedCoach) {
    const coachDoc = await Coach.findOne({ user: req.user._id, gym: gymId });
    resolvedCoach = coachDoc?.name || "Unassigned Coach";
  }
  if (!resolvedCoach) {
    return res.status(400).json({ message: "coach is required" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return res.status(400).json({ message: "A user with that email already exists" });
  }

  const planDoc = await resolveMembershipPlan(gymId, plan);
  const durationMonths = resolveSubscriptionDuration(planDoc, subscriptionDurationMonths);
  const joinedAt = new Date();
  const computedAmountDue = resolveSubscriptionCharge(planDoc, amountDue);
  const computedAmountPaid = normalizeCurrencyAmount(amountPaid);
  const computedPaymentStatus = derivePaymentStatus(computedAmountPaid, computedAmountDue);

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    name, email: normalizedEmail, passwordHash: hashPassword(temporaryPassword),
    role: "member", gym: gymId, mustChangePassword: true, passwordUpdatedAt: new Date()
  });

  const member = new Member({
    gym: gymId, user: user._id, name, email: normalizedEmail,
    phone: req.body?.phone || "", coach: resolvedCoach, plan,
    subscriptionDurationMonths: durationMonths, goal,
    status: deriveSubscriptionStatus({ planExpiresAt: addMonths(joinedAt, durationMonths) }, "active"),
    joinedAt, planStartedAt: joinedAt, planExpiresAt: addMonths(joinedAt, durationMonths),
    paymentStatus: computedPaymentStatus, amountPaid: computedAmountPaid, amountDue: computedAmountDue,
    dateOfBirth: parseDateOrNull(dateOfBirth), gender: gender || "", address: address || "",
    medicalNotes: medicalNotes || "", fitnessLevel: fitnessLevel || "",
    preferredWorkoutTime: preferredWorkoutTime || "", emergencyContact: emergencyContact || "",
    emergencyContactRelationship: emergencyContactRelationship || "", joinSource: joinSource || "",
    renewalReminderPreference: renewalReminderPreference || "", attendanceNotes: attendanceNotes || "",
    assignedLocker: assignedLocker || "", memberTag: memberTag || "", barcode: barcode || "",
    progressPhotos: parseStringList(progressPhotos), bodyFatPercentage: parseNumberOrNull(bodyFatPercentage),
    bmi: parseNumberOrNull(bmi), waistToHipRatio: parseNumberOrNull(waistToHipRatio),
    supplementUsage: supplementUsage || "", paymentMethod: paymentMethod || "",
    membershipFreezeStatus: membershipFreezeStatus || "", goalTargetDate: parseDateOrNull(goalTargetDate),
    heightCm: parseNumberOrNull(heightCm), currentWeightKg: parseNumberOrNull(currentWeightKg),
    targetWeightKg: parseNumberOrNull(targetWeightKg), targetBodyFat: parseNumberOrNull(targetBodyFat),
    personalNotes: personalNotes || "",
    bodyMeasurements: {
      chestCm: parseNumberOrNull(chestCm), waistCm: parseNumberOrNull(waistCm),
      armsCm: parseNumberOrNull(armsCm), thighsCm: parseNumberOrNull(thighsCm)
    },
    dietPlanName: dietPlanName || "", checkIns: 0, progress: 0, avatar: avatarFromName(name)
  });
  member.memberCode = buildMemberCode(member._id);
  await member.save();

  await User.findByIdAndUpdate(user._id, { memberProfile: member._id });

  await logCoachActivity(req, {
    action: "create-member", targetType: "member", targetId: member._id, targetName: member.name,
    summary: `Registered new member ${member.name} on plan ${plan}`,
    after: { name: member.name, plan, coach: resolvedCoach, goal, status: member.status }
  });

  if (member.phone) {
    const gym = await Gym.findById(gymId).select("name").lean();
    if (gym) {
      await sendSms({
        to: member.phone,
        message: `Welcome to ${gym.name}, ${name}! Your membership is active.\nEmail: ${normalizedEmail}\nTemp Password: ${temporaryPassword}`,
        type: "welcome",
        gymId,
        gymName: gym.name,
        recipientName: name
      });
    } else {
      console.error(`[sms] createMember: gym ${gymId} not found, skipping welcome SMS for member ${member._id}`);
    }
  }

  return res.status(201).json({
    id: member._id,
    credentials: { role: "member", email: normalizedEmail, temporaryPassword, mustChangePassword: true }
  });
}

async function updateMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const {
    name, coach, plan, goal, status, progress, checkIns, email, subscriptionDurationMonths,
    amountPaid, amountDue, planStartedAt, planExpiresAt, dietPlanName, emergencyContact,
    heightCm, dateOfBirth, gender, address, medicalNotes, fitnessLevel, preferredWorkoutTime,
    emergencyContactRelationship, joinSource, renewalReminderPreference, attendanceNotes,
    assignedLocker, memberTag, barcode, progressPhotos, bodyFatPercentage, bmi, waistToHipRatio,
    supplementUsage, paymentMethod, membershipFreezeStatus, goalTargetDate, currentWeightKg,
    targetWeightKg, targetBodyFat, personalNotes, chestCm, waistCm, armsCm, thighsCm
  } = req.body || {};

  if (name) { member.name = name; member.avatar = avatarFromName(name); }
  if (coach) member.coach = coach;
  if (plan) member.plan = plan;
  if (goal) member.goal = goal;
  if (progress != null) member.progress = Number(progress);
  if (checkIns != null) member.checkIns = Number(checkIns);
  const nextPlanDoc = plan ? await resolveMembershipPlan(member.gym, plan) : null;
  const nextDurationMonths = subscriptionDurationMonths != null
    ? resolveSubscriptionDuration(nextPlanDoc, subscriptionDurationMonths)
    : member.subscriptionDurationMonths;
  const nextAmountDue = amountDue != null ? resolveSubscriptionCharge(nextPlanDoc, amountDue) : member.amountDue;
  const nextAmountPaid = amountPaid != null ? normalizeCurrencyAmount(amountPaid) : member.amountPaid;

  member.subscriptionDurationMonths = nextDurationMonths;
  member.amountDue = nextAmountDue;
  member.amountPaid = nextAmountPaid;
  member.paymentStatus = derivePaymentStatus(nextAmountPaid, nextAmountDue);
  if (planStartedAt) member.planStartedAt = new Date(planStartedAt);
  if (planExpiresAt) {
    member.planExpiresAt = new Date(planExpiresAt);
  } else if (subscriptionDurationMonths != null || planStartedAt) {
    const subscriptionDates = resolveSubscriptionDates(member, member.planStartedAt, nextDurationMonths);
    member.planStartedAt = subscriptionDates.planStartedAt;
    member.planExpiresAt = subscriptionDates.planExpiresAt;
  }
  const subscriptionTouched = plan != null || subscriptionDurationMonths != null || planStartedAt != null || planExpiresAt != null;
  member.status = deriveSubscriptionStatus(
    member, status || (subscriptionTouched ? "active" : (member.status || "active"))
  );
  if (dietPlanName != null) member.dietPlanName = String(dietPlanName);
  if (emergencyContact != null) member.emergencyContact = String(emergencyContact);
  if (heightCm != null && heightCm !== "") member.heightCm = Number(heightCm);
  if (dateOfBirth !== undefined) member.dateOfBirth = parseDateOrNull(dateOfBirth);
  if (gender != null) member.gender = String(gender);
  if (address != null) member.address = String(address);
  if (medicalNotes != null) member.medicalNotes = String(medicalNotes);
  if (fitnessLevel != null) member.fitnessLevel = String(fitnessLevel);
  if (preferredWorkoutTime != null) member.preferredWorkoutTime = String(preferredWorkoutTime);
  if (emergencyContactRelationship != null) member.emergencyContactRelationship = String(emergencyContactRelationship);
  if (joinSource != null) member.joinSource = String(joinSource);
  if (renewalReminderPreference != null) member.renewalReminderPreference = String(renewalReminderPreference);
  if (attendanceNotes != null) member.attendanceNotes = String(attendanceNotes);
  if (assignedLocker != null) member.assignedLocker = String(assignedLocker);
  if (memberTag != null) member.memberTag = String(memberTag);
  if (barcode != null) member.barcode = String(barcode);
  if (progressPhotos != null) member.progressPhotos = parseStringList(progressPhotos);
  if (bodyFatPercentage !== undefined) member.bodyFatPercentage = parseNumberOrNull(bodyFatPercentage);
  if (bmi !== undefined) member.bmi = parseNumberOrNull(bmi);
  if (waistToHipRatio !== undefined) member.waistToHipRatio = parseNumberOrNull(waistToHipRatio);
  if (supplementUsage != null) member.supplementUsage = String(supplementUsage);
  if (paymentMethod != null) member.paymentMethod = String(paymentMethod);
  if (membershipFreezeStatus != null) member.membershipFreezeStatus = String(membershipFreezeStatus);
  if (goalTargetDate !== undefined) member.goalTargetDate = parseDateOrNull(goalTargetDate);
  if (currentWeightKg !== undefined) member.currentWeightKg = parseNumberOrNull(currentWeightKg);
  if (targetWeightKg !== undefined) member.targetWeightKg = parseNumberOrNull(targetWeightKg);
  if (targetBodyFat !== undefined) member.targetBodyFat = parseNumberOrNull(targetBodyFat);
  if (personalNotes != null) member.personalNotes = String(personalNotes);
  if (!member.bodyMeasurements || typeof member.bodyMeasurements !== "object") member.bodyMeasurements = {};
  if (chestCm !== undefined) member.bodyMeasurements.chestCm = parseNumberOrNull(chestCm);
  if (waistCm !== undefined) member.bodyMeasurements.waistCm = parseNumberOrNull(waistCm);
  if (armsCm !== undefined) member.bodyMeasurements.armsCm = parseNumberOrNull(armsCm);
  if (thighsCm !== undefined) member.bodyMeasurements.thighsCm = parseNumberOrNull(thighsCm);

  await member.save();

  if (member.user) {
    const userUpdates = { name: member.name };
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: member.user } }).lean();
      if (existingUser) return res.status(400).json({ message: "A user with that email already exists" });
      userUpdates.email = normalizedEmail;
    }
    await User.findByIdAndUpdate(member.user, userUpdates);
  }

  return res.json({ message: "Member updated" });
}

async function resetMemberPassword(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });
  if (!member.user) return res.status(404).json({ message: "Member account is not linked to a login user" });

  const user = await User.findById(member.user);
  if (!user) return res.status(404).json({ message: "Member login account not found" });

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordUpdatedAt = new Date();
  user.status = "active";
  await user.save();

  return res.json({
    message: "Member password reset",
    credentials: { role: "member", email: user.email, temporaryPassword, mustChangePassword: true }
  });
}

async function updateMemberSubscription(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const { plan, durationMonths, amountPaid, amountDue, dietPlanName, planStartedAt } = req.body || {};

  if (plan) member.plan = plan;

  const nextPlanDoc = await resolveMembershipPlan(member.gym, member.plan);
  const nextDurationMonths = resolveSubscriptionDuration(nextPlanDoc, durationMonths != null ? durationMonths : member.subscriptionDurationMonths);
  const nextAmountDue = resolveSubscriptionCharge(nextPlanDoc, amountDue != null ? amountDue : member.amountDue);
  const nextAmountPaid = amountPaid != null ? normalizeCurrencyAmount(amountPaid) : member.amountPaid;

  member.subscriptionDurationMonths = nextDurationMonths;
  member.amountDue = nextAmountDue;
  member.amountPaid = nextAmountPaid;
  member.paymentStatus = derivePaymentStatus(nextAmountPaid, nextAmountDue);

  if (dietPlanName != null) member.dietPlanName = String(dietPlanName);

  const subscriptionDates = resolveSubscriptionDates(member, planStartedAt, nextDurationMonths);
  member.planStartedAt = subscriptionDates.planStartedAt;
  member.planExpiresAt = subscriptionDates.planExpiresAt;
  member.status = deriveSubscriptionStatus(member, "active");

  if (!Array.isArray(member.paymentHistory)) member.paymentHistory = [];
  member.paymentHistory.push({
    date: new Date(), amount: nextAmountPaid,
    method: req.body?.paymentMethod || member.paymentMethod || "",
    planName: member.plan, months: nextDurationMonths, note: req.body?.note || "",
    chequeNumber: req.body?.chequeNumber ? String(req.body.chequeNumber).trim() : "",
    bankName: req.body?.bankName ? String(req.body.bankName).trim() : "",
    referenceNumber: req.body?.referenceNumber ? String(req.body.referenceNumber).trim() : ""
  });

  if (req.body?.paymentMethod) member.paymentMethod = String(req.body.paymentMethod);

  await member.save();

  if (member.phone) {
    const gym = await Gym.findById(member.gym).select("name").lean();
    if (gym) {
      await sendSms({
        to: member.phone,
        message: `Hi ${member.name}, your ${member.plan} membership at ${gym.name} has been renewed for ${nextDurationMonths} month(s). Expires: ${member.planExpiresAt.toLocaleDateString("en-LK")}.`,
        type: "payment-reminder",
        gymId: member.gym,
        gymName: gym.name,
        recipientName: member.name
      });
    } else {
      console.error(`[sms] updateMemberSubscription: gym ${member.gym} not found, skipping SMS for member ${member._id}`);
    }
  }

  return res.json({ message: "Member subscription updated" });
}

async function deleteMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  await Member.findByIdAndDelete(req.params.id);
  if (member?.user) await User.findByIdAndDelete(member.user);
  return res.json({ message: "Member removed" });
}

async function approveMemberRequest(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Registration request not found" });
  if (user.role !== "member" || user.status !== "pending") {
    return res.status(400).json({ message: "This account is not a pending member request" });
  }
  if (!canManageGym(req, user.gym)) return res.status(403).json({ message: "You do not have access to this member request" });

  const firstCoach = await Coach.findOne({ gym: user.gym, status: "active" }).sort({ createdAt: 1 }).lean();
  const firstPlan = await MembershipPlan.findOne({ gym: user.gym }).sort({ createdAt: 1 }).lean();
  const joinedAt = new Date();
  const durationMonths = Number(firstPlan?.durationMonths || 1);
  const amountDue = Number(firstPlan?.price || 0);

  const member = new Member({
    gym: user.gym, user: user._id, name: user.name,
    coach: firstCoach?.name || "Unassigned Coach",
    plan: firstPlan?.name || "Pending Plan",
    subscriptionDurationMonths: durationMonths,
    goal: user.requestedGoal || "General Fitness",
    status: deriveSubscriptionStatus({ planExpiresAt: addMonths(joinedAt, durationMonths) }, "active"),
    joinedAt, planStartedAt: joinedAt, planExpiresAt: addMonths(joinedAt, durationMonths),
    paymentStatus: amountDue > 0 ? "unpaid" : "paid",
    amountPaid: 0, amountDue, dietPlanName: "", checkIns: 0, progress: 0,
    avatar: avatarFromName(user.name)
  });
  member.memberCode = buildMemberCode(member._id);
  await member.save();

  user.memberProfile = member._id;
  user.status = "active";
  await user.save();

  if (user.phone) {
    const gym = await Gym.findById(user.gym).select("name").lean();
    if (gym) {
      await sendSms({
        to: user.phone,
        message: `Great news, ${user.name}! Your membership at ${gym.name} has been approved. You can now log in at ${process.env.CLIENT_URL}/login.`,
        type: "welcome",
        gymId: user.gym,
        gymName: gym.name,
        recipientName: user.name
      });
    } else {
      console.error(`[sms] approveMemberRequest: gym ${user.gym} not found, skipping SMS for user ${user._id}`);
    }
  }

  return res.json({ message: "Member registration approved" });
}

async function rejectMemberRequest(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Registration request not found" });
  if (user.role !== "member" || user.status !== "pending") {
    return res.status(400).json({ message: "This account is not a pending member request" });
  }
  if (!canManageGym(req, user.gym)) return res.status(403).json({ message: "You do not have access to this member request" });

  user.status = "rejected";
  await user.save();
  return res.json({ message: "Member registration rejected" });
}

module.exports = {
  createMember, updateMember, resetMemberPassword, updateMemberSubscription,
  deleteMember, approveMemberRequest, rejectMemberRequest
};
