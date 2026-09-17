const User = require("../models/User");
const Coach = require("../models/Coach");
const Member = require("../models/Member");
const Gym = require("../models/Gym");
const { formatAuthUser } = require("./authController");
const {
  toNumberOrNull, toDateOrNull, toStringList,
  syncLatestWeightEntry, logCoachProfileEdit
} = require("./profileUtils");

async function updateMyProfile(req, res) {
  const authUser = await User.findById(req.user._id);

  if (!authUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const {
    name,
    email,
    phone,
    bio,
    title,
    specialty,
    certifications,
    goal,
    emergencyContact,
    heightCm,
    currentWeightKg,
    targetWeightKg,
    targetBodyFat,
    personalNotes,
    chestCm,
    waistCm,
    armsCm,
    thighsCm,
    dateOfBirth,
    gender,
    address,
    nationalId,
    employeeCode,
    hireDate,
    employmentType,
    salaryModel,
    shiftSchedule,
    specializations,
    yearsOfExperience,
    languages,
    certificationExpiryDates,
    availableHours,
    maxClientCapacity,
    performanceNotes,
    bankPaymentDetails,
    medicalNotes,
    fitnessLevel,
    preferredWorkoutTime,
    emergencyContactRelationship,
    joinSource,
    renewalReminderPreference,
    attendanceNotes,
    assignedLocker,
    memberTag,
    barcode,
    progressPhotos,
    bodyFatPercentage,
    bmi,
    waistToHipRatio,
    supplementUsage,
    paymentMethod,
    membershipFreezeStatus,
    goalTargetDate,
    documents
  } = req.body || {};

  const coach = authUser.role === "coach" ? await Coach.findOne({ user: authUser._id }) : null;
  const coachProfileBefore = coach ? {
    name: coach.name,
    email: coach.email,
    phone: authUser.phone || "",
    bio: authUser.bio || "",
    title: authUser.title || "",
    specialty: coach.specialty || "",
    certifications: coach.certifications || "",
    profileImageUrl: authUser.profileImageUrl || ""
  } : null;

  if (email) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: authUser._id } }).lean();
    if (existing) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }
    authUser.email = normalizedEmail;
  }

  if (name) {
    authUser.name = name;
  }
  if (phone != null) {
    authUser.phone = String(phone);
  }
  if (bio != null) {
    authUser.bio = String(bio);
  }
  if (title != null) {
    authUser.title = String(title);
  }
  if (req.file?.filename && authUser.role !== "member") {
    authUser.profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
  }

  if (authUser.role === "owner") {
    const { address, city, country, dateOfBirth: dob, gender: gen, emergencyContactName, emergencyContactPhone, website } = req.body || {};
    if (address != null) authUser.address = String(address);
    if (city != null) authUser.city = String(city);
    if (country != null) authUser.country = String(country);
    if (dob !== undefined) authUser.dateOfBirth = dob ? new Date(dob) : null;
    if (gen != null) authUser.gender = String(gen);
    if (emergencyContactName != null) authUser.emergencyContactName = String(emergencyContactName);
    if (emergencyContactPhone != null) authUser.emergencyContactPhone = String(emergencyContactPhone);
    if (website != null) authUser.website = String(website);
  }

  await authUser.save();

  if (authUser.role === "owner" && authUser.gym) {
    await Gym.findByIdAndUpdate(authUser.gym, {
      ownerName: authUser.name,
      ownerEmail: authUser.email
    });
  }

  if (authUser.role === "coach") {
    if (coach) {
      if (name) {
        coach.name = name;
      }
      if (email) {
        coach.email = authUser.email;
      }
      if (specialty != null) {
        coach.specialty = String(specialty);
      }
      if (certifications != null) {
        coach.certifications = String(certifications);
      }
      if (dateOfBirth !== undefined) coach.dateOfBirth = toDateOrNull(dateOfBirth);
      if (gender != null) coach.gender = String(gender);
      if (address != null) coach.address = String(address);
      if (nationalId != null) coach.nationalId = String(nationalId);
      if (employeeCode != null) coach.employeeCode = String(employeeCode);
      if (hireDate !== undefined) coach.hireDate = toDateOrNull(hireDate);
      if (employmentType != null) coach.employmentType = String(employmentType);
      if (salaryModel != null) coach.salaryModel = String(salaryModel);
      if (shiftSchedule != null) coach.shiftSchedule = String(shiftSchedule);
      if (specializations != null) coach.specializations = toStringList(specializations);
      if (yearsOfExperience !== undefined) coach.yearsOfExperience = toNumberOrNull(yearsOfExperience);
      if (languages != null) coach.languages = toStringList(languages);
      if (certificationExpiryDates != null) coach.certificationExpiryDates = toStringList(certificationExpiryDates);
      if (availableHours != null) coach.availableHours = String(availableHours);
      if (maxClientCapacity !== undefined) coach.maxClientCapacity = toNumberOrNull(maxClientCapacity);
      if (performanceNotes != null) coach.performanceNotes = String(performanceNotes);
      if (bankPaymentDetails != null) coach.bankPaymentDetails = String(bankPaymentDetails);
      if (emergencyContact != null) coach.emergencyContact = String(emergencyContact);
      if (documents != null) coach.documents = toStringList(documents);
      await coach.save();

      await logCoachProfileEdit(authUser, {
        before: coachProfileBefore,
        after: {
          name: coach.name,
          email: coach.email,
          phone: authUser.phone || "",
          bio: authUser.bio || "",
          title: authUser.title || "",
          specialty: coach.specialty || "",
          certifications: coach.certifications || "",
          profileImageUrl: authUser.profileImageUrl || ""
        }
      });
    }
  }

  if (authUser.role === "member") {
    const member = await Member.findOne({ user: authUser._id });
    if (member) {
      if (name) {
        member.name = name;
      }
      if (goal != null) {
        member.goal = String(goal);
      }
      if (dateOfBirth !== undefined) member.dateOfBirth = toDateOrNull(dateOfBirth);
      if (gender != null) member.gender = String(gender);
      if (address != null) member.address = String(address);
      if (medicalNotes != null) member.medicalNotes = String(medicalNotes);
      if (fitnessLevel != null) member.fitnessLevel = String(fitnessLevel);
      if (preferredWorkoutTime != null) member.preferredWorkoutTime = String(preferredWorkoutTime);
      if (emergencyContact != null) {
        member.emergencyContact = String(emergencyContact);
      }
      if (emergencyContactRelationship != null) {
        member.emergencyContactRelationship = String(emergencyContactRelationship);
      }
      if (joinSource != null) member.joinSource = String(joinSource);
      if (renewalReminderPreference != null) member.renewalReminderPreference = String(renewalReminderPreference);
      if (attendanceNotes != null) member.attendanceNotes = String(attendanceNotes);
      if (assignedLocker != null) member.assignedLocker = String(assignedLocker);
      if (memberTag != null) member.memberTag = String(memberTag);
      if (barcode != null) member.barcode = String(barcode);
      if (progressPhotos != null) member.progressPhotos = toStringList(progressPhotos);
      if (heightCm != null && heightCm !== "") {
        member.heightCm = Number(heightCm);
      } else if (heightCm === "") {
        member.heightCm = null;
      }
      if (currentWeightKg != null) {
        member.currentWeightKg = toNumberOrNull(currentWeightKg);
        syncLatestWeightEntry(member, member.currentWeightKg);
      }
      if (targetWeightKg != null) {
        member.targetWeightKg = toNumberOrNull(targetWeightKg);
      }
      if (targetBodyFat != null) {
        member.targetBodyFat = toNumberOrNull(targetBodyFat);
      }
      if (bodyFatPercentage != null) member.bodyFatPercentage = toNumberOrNull(bodyFatPercentage);
      if (bmi != null) member.bmi = toNumberOrNull(bmi);
      if (waistToHipRatio != null) member.waistToHipRatio = toNumberOrNull(waistToHipRatio);
      if (supplementUsage != null) member.supplementUsage = String(supplementUsage);
      if (paymentMethod != null) member.paymentMethod = String(paymentMethod);
      if (membershipFreezeStatus != null) member.membershipFreezeStatus = String(membershipFreezeStatus);
      if (goalTargetDate !== undefined) member.goalTargetDate = toDateOrNull(goalTargetDate);
      if (personalNotes != null) {
        member.personalNotes = String(personalNotes);
      }
      if (!member.bodyMeasurements || typeof member.bodyMeasurements !== "object") {
        member.bodyMeasurements = {};
      }
      if (chestCm != null) {
        member.bodyMeasurements.chestCm = toNumberOrNull(chestCm);
      }
      if (waistCm != null) {
        member.bodyMeasurements.waistCm = toNumberOrNull(waistCm);
      }
      if (armsCm != null) {
        member.bodyMeasurements.armsCm = toNumberOrNull(armsCm);
      }
      if (thighsCm != null) {
        member.bodyMeasurements.thighsCm = toNumberOrNull(thighsCm);
      }
      await member.save();
    }
  }

  return res.json({
    message: "Profile updated",
    user: formatAuthUser(authUser)
  });
}

async function updateMyWorkoutProgress(req, res) {
  if (req.user?.role !== "member") {
    return res.status(403).json({ message: "Only members can update workout progress" });
  }

  const member = await Member.findOne({ user: req.user._id });
  if (!member) {
    return res.status(404).json({ message: "Member profile not found" });
  }

  if (!member.myWorkoutPlan?.today || !Array.isArray(member.myWorkoutPlan.today.exercises)) {
    return res.status(400).json({ message: "No assigned workout plan found" });
  }

  const exercises = Array.isArray(req.body?.exercises) ? req.body.exercises : null;
  if (!exercises) {
    return res.status(400).json({ message: "Workout exercises are required" });
  }

  const updatedExercises = member.myWorkoutPlan.today.exercises.map((existingExercise, index) => {
    const incomingExercise = exercises[index];
    if (!incomingExercise || typeof incomingExercise !== "object") {
      return existingExercise;
    }

    const nextDone = Boolean(incomingExercise.done);
    const priorCompletedAt = existingExercise.completedAt ? new Date(existingExercise.completedAt) : null;

    return {
      ...existingExercise,
      done: nextDone,
      loggedWeight: String(incomingExercise.loggedWeight || "").trim(),
      completionNotes: String(incomingExercise.completionNotes || "").trim(),
      completedAt: nextDone ? (priorCompletedAt || new Date()) : null
    };
  });

  member.myWorkoutPlan.today.exercises = updatedExercises;

  const anyDone = updatedExercises.some((e) => e.done);
  if (anyDone) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alreadyLogged = (member.workoutHistory || []).some((entry) => {
      const entryDay = new Date(entry.date);
      entryDay.setHours(0, 0, 0, 0);
      return entryDay.getTime() === today.getTime();
    });
    if (!alreadyLogged) {
      if (!Array.isArray(member.workoutHistory)) member.workoutHistory = [];
      member.workoutHistory.push({
        date: new Date(),
        planName: member.myWorkoutPlan.name || "",
        day: member.myWorkoutPlan.today.day || "",
        exercises: updatedExercises
      });
      if (member.workoutHistory.length > 365) {
        member.workoutHistory = member.workoutHistory.slice(-365);
      }
    } else {
      const entryIndex = member.workoutHistory.findIndex((entry) => {
        const entryDay = new Date(entry.date);
        entryDay.setHours(0, 0, 0, 0);
        return entryDay.getTime() === today.getTime();
      });
      if (entryIndex !== -1) {
        member.workoutHistory[entryIndex].exercises = updatedExercises;
      }
    }
    member.markModified("workoutHistory");
  }

  await member.save();

  return res.json({
    message: "Workout progress updated",
    myWorkoutPlan: member.myWorkoutPlan
  });
}

async function markNotificationsRead(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : [];
  const authUser = await User.findById(req.user._id);
  if (!authUser) return res.status(404).json({ message: "User not found" });
  const merged = Array.from(new Set([...(authUser.readNotificationIds || []), ...ids]));
  authUser.readNotificationIds = merged.slice(-200);
  await authUser.save();
  return res.json({ readNotificationIds: authUser.readNotificationIds });
}

module.exports = {
  updateMyProfile,
  updateMyWorkoutProgress,
  markNotificationsRead
};
