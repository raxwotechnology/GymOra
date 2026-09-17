const User = require("../models/User");
const Coach = require("../models/Coach");
const Member = require("../models/Member");
const Gym = require("../models/Gym");
const Equipment = require("../models/Equipment");
const Expense = require("../models/Expense");
const { hashPassword } = require("../utils/password");

const MEMBER_GOAL_PROFILES = {
  "Muscle Gain": { currentWeightKg: 72, targetWeightKg: 78, targetBodyFat: 14 },
  "Weight Loss": { currentWeightKg: 81, targetWeightKg: 72, targetBodyFat: 18 },
  Strength: { currentWeightKg: 85, targetWeightKg: 88, targetBodyFat: 15 },
  Flexibility: { currentWeightKg: 64, targetWeightKg: 62, targetBodyFat: 20 },
  Powerlifting: { currentWeightKg: 92, targetWeightKg: 96, targetBodyFat: 17 },
  CrossFit: { currentWeightKg: 74, targetWeightKg: 76, targetBodyFat: 16 },
  Wellness: { currentWeightKg: 68, targetWeightKg: 66, targetBodyFat: 21 },
  "General Fitness": { currentWeightKg: 70, targetWeightKg: 68, targetBodyFat: 20 }
};

function fallbackPhone(index) {
  return `077555${String(100 + index).padStart(3, "0")}`;
}

function ownerPhone(index) {
  return `076880${String(100 + index).padStart(3, "0")}`;
}

function safeTrim(value) {
  return String(value || "").trim();
}

function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

async function ensureUniqueDemoEmail(baseLocalPart) {
  const normalizedBase = slugifyName(baseLocalPart) || "member";
  let attempt = 0;

  while (attempt < 5000) {
    const localPart = attempt === 0 ? normalizedBase : `${normalizedBase}${attempt + 1}`;
    const email = `${localPart}@demo.fitnesshub.local`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ email }).select("_id").lean();
    if (!existing) {
      return email;
    }
    attempt += 1;
  }

  return `${normalizedBase}.${Date.now()}@demo.fitnesshub.local`;
}

function buildUserTitle(user, gymName = "") {
  if (user.role === "super-admin") {
    return "Platform Administrator";
  }

  if (user.role === "owner") {
    return gymName ? `${gymName} Owner` : "Gym Owner";
  }

  if (user.role === "coach") {
    return "Senior Fitness Coach";
  }

  return "Active Member";
}

function buildUserBio(user, gymName = "") {
  if (user.role === "super-admin") {
    return "Oversees platform operations, gym onboarding, account health, and day-to-day performance across the FitnessHub network.";
  }

  if (user.role === "owner") {
    return gymName
      ? `Leads operations, member experience, and growth initiatives for ${gymName}.`
      : "Leads gym operations, member experience, and commercial performance.";
  }

  if (user.role === "coach") {
    return gymName
      ? `Supports members at ${gymName} with structured coaching, progressive training plans, and consistent accountability.`
      : "Supports members with structured coaching, progressive training plans, and consistent accountability.";
  }

  return gymName
    ? `Training actively with the ${gymName} community while tracking progress, attendance, and performance goals in the app.`
    : "Training actively while tracking progress, attendance, and performance goals in the app.";
}

function buildCoachCertifications(index, specialty) {
  const certifications = [
    "ACE Certified Personal Trainer, Functional Strength Coach",
    "NASM Certified Personal Trainer, HIIT Programming Specialist",
    "ISSA Fitness Nutrition Coach, Group Training Instructor",
    "Strength And Conditioning Level 1, Mobility Coaching Certificate"
  ];

  return `${certifications[index % certifications.length]}${specialty ? ` | Focus: ${specialty}` : ""}`;
}

function buildCoachDate(index) {
  return new Date(1988 + (index % 10), (index * 2) % 12, 5 + (index % 20));
}

function buildMemberDate(index) {
  return new Date(1992 + (index % 12), (index * 3) % 12, 8 + (index % 18));
}

function buildMemberMeasurements(index, currentWeightKg) {
  const baseWeight = Number(currentWeightKg || 70);
  return {
    chestCm: 90 + (index % 6) * 3,
    waistCm: 74 + (index % 7) * 2,
    armsCm: 30 + (index % 5) * 1.5,
    thighsCm: 50 + (index % 6) * 2
  };
}

function buildMemberStats(index, currentWeightKg, targetBodyFat) {
  const currentWeight = Number(currentWeightKg || 70);
  const bodyFat = Number(targetBodyFat || 20);
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return {
    labels,
    weight: labels.map((_, itemIndex) => Number((currentWeight - 1.5 + itemIndex * 0.3).toFixed(1))),
    bodyFat: labels.map((_, itemIndex) => Number((bodyFat + 1.5 - itemIndex * 0.3).toFixed(1))),
    benchPress: labels.map((_, itemIndex) => 35 + index * 3 + itemIndex * 2.5),
    checkInsThisMonth: 10 + (index % 8),
    streak: 2 + (index % 5),
    totalCheckIns: 35 + index * 7
  };
}

async function backfillDemoDetails() {
  const [users, coaches, members, gyms] = await Promise.all([
    User.find().sort({ createdAt: 1 }),
    Coach.find().sort({ createdAt: 1 }),
    Member.find().sort({ createdAt: 1 }),
    Gym.find().lean()
  ]);

  const gymById = new Map(gyms.map((gym) => [String(gym._id), gym]));
  let changed = 0;

  for (const [index, user] of users.entries()) {
    const gym = gymById.get(String(user.gym || "")) || null;
    let dirty = false;

    if (!safeTrim(user.phone)) {
      user.phone = user.role === "owner" ? ownerPhone(index) : fallbackPhone(index);
      dirty = true;
    }

    if (!safeTrim(user.title)) {
      user.title = buildUserTitle(user, gym?.name || "");
      dirty = true;
    }

    if (!safeTrim(user.bio)) {
      user.bio = buildUserBio(user, gym?.name || "");
      dirty = true;
    }

    if (dirty) {
      await user.save();
      changed += 1;
    }
  }

  for (const [index, coach] of coaches.entries()) {
    let dirty = false;

    if (!safeTrim(coach.specialty)) {
      coach.specialty = "General Fitness Coaching";
      dirty = true;
    }

    if (!safeTrim(coach.certifications)) {
      coach.certifications = buildCoachCertifications(index, coach.specialty);
      dirty = true;
    }
    if (!coach.dateOfBirth) {
      coach.dateOfBirth = buildCoachDate(index);
      dirty = true;
    }
    if (!safeTrim(coach.gender)) {
      coach.gender = index % 2 === 0 ? "Female" : "Male";
      dirty = true;
    }
    if (!safeTrim(coach.address)) {
      coach.address = `No. ${20 + index}, Trainer Avenue, ${index % 2 === 0 ? "Colombo" : "Kandy"}`;
      dirty = true;
    }
    if (!safeTrim(coach.nationalId)) {
      coach.nationalId = `NIC${String(810000000 + index).padStart(9, "0")}`;
      dirty = true;
    }
    if (!safeTrim(coach.employeeCode)) {
      coach.employeeCode = coach.coachCode || `EMP-${String(index + 1).padStart(3, "0")}`;
      dirty = true;
    }
    if (!coach.hireDate) {
      coach.hireDate = new Date(2021 + (index % 4), index % 12, 1 + (index % 20));
      dirty = true;
    }
    if (!safeTrim(coach.employmentType)) {
      coach.employmentType = index % 3 === 0 ? "Part-time" : "Full-time";
      dirty = true;
    }
    if (!safeTrim(coach.salaryModel)) {
      coach.salaryModel = index % 2 === 0 ? "Base salary + PT commission" : "Session-based commission";
      dirty = true;
    }
    if (!safeTrim(coach.shiftSchedule)) {
      coach.shiftSchedule = index % 2 === 0 ? "Morning shift | 6:00 AM - 2:00 PM" : "Evening shift | 2:00 PM - 10:00 PM";
      dirty = true;
    }
    if (!Array.isArray(coach.specializations) || coach.specializations.length === 0) {
      coach.specializations = [coach.specialty || "General Fitness", "Member Transformation", "Program Design"];
      dirty = true;
    }
    if (coach.yearsOfExperience == null) {
      coach.yearsOfExperience = 3 + index;
      dirty = true;
    }
    if (!Array.isArray(coach.languages) || coach.languages.length === 0) {
      coach.languages = index % 2 === 0 ? ["English", "Sinhala"] : ["English", "Tamil"];
      dirty = true;
    }
    if (!Array.isArray(coach.certificationExpiryDates) || coach.certificationExpiryDates.length === 0) {
      coach.certificationExpiryDates = ["2027-06-30", "2028-01-15"];
      dirty = true;
    }
    if (!safeTrim(coach.availableHours)) {
      coach.availableHours = index % 2 === 0 ? "Mon-Sat | 6:00 AM - 1:00 PM" : "Mon-Sat | 1:00 PM - 9:00 PM";
      dirty = true;
    }
    if (coach.maxClientCapacity == null) {
      coach.maxClientCapacity = 25 + index * 3;
      dirty = true;
    }
    if (!safeTrim(coach.performanceNotes)) {
      coach.performanceNotes = "Delivers structured sessions, maintains strong member engagement, and follows up consistently on attendance and plan adherence.";
      dirty = true;
    }
    if (!safeTrim(coach.bankPaymentDetails)) {
      coach.bankPaymentDetails = `Demo Bank | A/C 100200${String(index + 1).padStart(3, "0")} | Trainer Payroll`;
      dirty = true;
    }
    if (!safeTrim(coach.emergencyContact)) {
      coach.emergencyContact = `Coach Emergency ${index + 1} - 075440${String(100 + index).padStart(3, "0")}`;
      dirty = true;
    }
    if (!Array.isArray(coach.documents) || coach.documents.length === 0) {
      coach.documents = ["Certificate of Fitness Coaching", "First Aid Clearance", "Identity Verification"];
      dirty = true;
    }

    if (coach.members == null) {
      coach.members = 0;
      dirty = true;
    }

    if (dirty) {
      await coach.save();
      changed += 1;
    }
  }

  for (const [index, member] of members.entries()) {
    const profile = MEMBER_GOAL_PROFILES[member.goal] || MEMBER_GOAL_PROFILES["General Fitness"];
    let dirty = false;

    let linkedUser = member.user ? users.find((item) => String(item._id) === String(member.user)) || null : null;
    if (!linkedUser) {
      const demoEmail = await ensureUniqueDemoEmail(member.name);
      linkedUser = await User.create({
        name: member.name,
        email: demoEmail,
        passwordHash: hashPassword("gym123"),
        role: "member",
        status: member.status === "inactive" ? "suspended" : "active",
        phone: fallbackPhone(index + 50),
        bio: buildUserBio({ role: "member" }, gymById.get(String(member.gym || ""))?.name || ""),
        title: buildUserTitle({ role: "member" }),
        requestedGoal: member.goal || "General Fitness",
        gym: member.gym,
        memberProfile: member._id,
        mustChangePassword: false
      });
      users.push(linkedUser);
      member.user = linkedUser._id;
      dirty = true;
      changed += 1;
    } else if (String(linkedUser.memberProfile || "") !== String(member._id)) {
      linkedUser.memberProfile = member._id;
      await linkedUser.save();
      changed += 1;
    }

    if (!member.dateOfBirth) {
      member.dateOfBirth = buildMemberDate(index);
      dirty = true;
    }
    if (!safeTrim(member.gender)) {
      member.gender = index % 2 === 0 ? "Male" : "Female";
      dirty = true;
    }
    if (!safeTrim(member.address)) {
      member.address = `No. ${55 + index}, Member Lane, ${index % 2 === 0 ? "Colombo" : "Galle"}`;
      dirty = true;
    }
    if (!safeTrim(member.medicalNotes)) {
      member.medicalNotes = index % 3 === 0 ? "Mild lower-back tightness. Avoid sudden heavy deadlift jumps." : "No major medical restrictions reported.";
      dirty = true;
    }
    if (!safeTrim(member.fitnessLevel)) {
      member.fitnessLevel = ["Beginner", "Intermediate", "Advanced"][index % 3];
      dirty = true;
    }
    if (!safeTrim(member.preferredWorkoutTime)) {
      member.preferredWorkoutTime = index % 2 === 0 ? "Early Morning" : "Evening";
      dirty = true;
    }
    if (member.heightCm == null) {
      member.heightCm = 160 + (index % 10) * 2;
      dirty = true;
    }

    if (!safeTrim(member.emergencyContact)) {
      member.emergencyContact = `Guardian ${index + 1} - 071900${String(100 + index).padStart(3, "0")}`;
      dirty = true;
    }
    if (!safeTrim(member.emergencyContactRelationship)) {
      member.emergencyContactRelationship = index % 2 === 0 ? "Parent" : "Spouse";
      dirty = true;
    }

    if (member.currentWeightKg == null) {
      member.currentWeightKg = profile.currentWeightKg + (index % 4);
      dirty = true;
    }

    if (member.targetWeightKg == null) {
      member.targetWeightKg = profile.targetWeightKg + (index % 3);
      dirty = true;
    }

    if (member.targetBodyFat == null) {
      member.targetBodyFat = profile.targetBodyFat;
      dirty = true;
    }

    if (!safeTrim(member.personalNotes)) {
      member.personalNotes = "Demo profile note: staying consistent with training, hydration, sleep, and weekly coaching check-ins.";
      dirty = true;
    }
    if (!safeTrim(member.joinSource)) {
      member.joinSource = ["Walk-in", "Referral", "Instagram", "Facebook"][index % 4];
      dirty = true;
    }
    if (!safeTrim(member.renewalReminderPreference)) {
      member.renewalReminderPreference = index % 2 === 0 ? "WhatsApp + Email" : "SMS + Call";
      dirty = true;
    }
    if (!safeTrim(member.attendanceNotes)) {
      member.attendanceNotes = "Usually attends on schedule. Follow up if two consecutive sessions are missed.";
      dirty = true;
    }
    if (!safeTrim(member.assignedLocker)) {
      member.assignedLocker = `L-${String(10 + index).padStart(3, "0")}`;
      dirty = true;
    }
    if (!safeTrim(member.memberTag)) {
      member.memberTag = `TAG-${String(1000 + index)}`;
      dirty = true;
    }
    if (!safeTrim(member.barcode)) {
      member.barcode = `FH-M-${String(100000 + index)}`;
      dirty = true;
    }
    if (!Array.isArray(member.progressPhotos) || member.progressPhotos.length === 0) {
      member.progressPhotos = ["front-checkin-photo", "side-checkin-photo", "monthly-progress-photo"];
      dirty = true;
    }
    if (member.bodyFatPercentage == null) {
      member.bodyFatPercentage = profile.targetBodyFat + 2;
      dirty = true;
    }
    if (member.bmi == null) {
      member.bmi = Number((((member.currentWeightKg || 70) / (((member.heightCm || 170) / 100) ** 2))).toFixed(1));
      dirty = true;
    }
    if (member.waistToHipRatio == null) {
      member.waistToHipRatio = Number((0.78 + (index % 5) * 0.03).toFixed(2));
      dirty = true;
    }
    if (!safeTrim(member.supplementUsage)) {
      member.supplementUsage = index % 2 === 0 ? "Whey protein, creatine, electrolyte mix" : "Protein shake, multivitamin";
      dirty = true;
    }
    if (!safeTrim(member.paymentMethod)) {
      member.paymentMethod = index % 2 === 0 ? "Card" : "Bank Transfer";
      dirty = true;
    }
    if (!safeTrim(member.membershipFreezeStatus)) {
      member.membershipFreezeStatus = member.status === "inactive" ? "Frozen - pending renewal" : "Active";
      dirty = true;
    }
    if (!member.goalTargetDate) {
      member.goalTargetDate = new Date(2026, 11 - (index % 4), 15);
      dirty = true;
    }

    if (!member.bodyMeasurements || typeof member.bodyMeasurements !== "object") {
      member.bodyMeasurements = {};
      dirty = true;
    }

    const measurements = buildMemberMeasurements(index, member.currentWeightKg);
    for (const [key, value] of Object.entries(measurements)) {
      if (member.bodyMeasurements[key] == null) {
        member.bodyMeasurements[key] = value;
        dirty = true;
      }
    }

    if (!Array.isArray(member.myStats?.labels) || member.myStats.labels.length === 0) {
      member.myStats = buildMemberStats(index, member.currentWeightKg, member.targetBodyFat);
      dirty = true;
    }

    if (dirty) {
      await member.save();
      changed += 1;
    }
  }

  const equipmentItems = await Equipment.find().sort({ createdAt: 1 });
  for (const item of equipmentItems) {
    if (!item.nextServiceDate) {
      const lastService = item.lastService ? new Date(item.lastService) : new Date();
      item.nextServiceDate = new Date(lastService.getFullYear(), lastService.getMonth() + 3, lastService.getDate());
      await item.save();
      changed += 1;
    }
  }

  const ledgerItems = await Expense.find().sort({ createdAt: 1 });
  for (const [index, item] of ledgerItems.entries()) {
    let dirty = false;
    if (!safeTrim(item.type)) {
      item.type = "expense";
      dirty = true;
    }
    if (!safeTrim(item.sourceType)) {
      item.sourceType = "manual";
      dirty = true;
    }
    if (!safeTrim(item.title)) {
      item.title = item.type === "income" ? `Manual Income ${index + 1}` : `Operating Expense ${index + 1}`;
      dirty = true;
    }
    if (!safeTrim(item.category)) {
      item.category = item.type === "income" ? "Other Income" : "Operations";
      dirty = true;
    }
    if (!safeTrim(item.vendor)) {
      item.vendor = item.type === "income" ? `Income Source ${index + 1}` : `Vendor ${index + 1}`;
      dirty = true;
    }
    if (!safeTrim(item.contactName)) {
      item.contactName = item.type === "income" ? `Client Contact ${index + 1}` : `Vendor Contact ${index + 1}`;
      dirty = true;
    }
    if (!safeTrim(item.paymentMethod)) {
      item.paymentMethod = index % 2 === 0 ? "bank-transfer" : "cash";
      dirty = true;
    }
    if (!safeTrim(item.referenceNumber)) {
      item.referenceNumber = `${item.type === "income" ? "INC" : "EXP"}-${String(index + 1).padStart(4, "0")}`;
      dirty = true;
    }
    if (!safeTrim(item.notes)) {
      item.notes = item.type === "income"
        ? "Demo income entry added for ledger completeness and reporting previews."
        : "Demo expense entry added for ledger completeness and reporting previews.";
      dirty = true;
    }
    if (dirty) {
      await item.save();
      changed += 1;
    }
  }

  return { changed };
}

module.exports = backfillDemoDetails;
