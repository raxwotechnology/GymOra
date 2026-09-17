const Coach = require("../../models/Coach");
const User = require("../../models/User");
const {
  avatarFromName,
  normalizeEmail,
  parseDateOrNull,
  parseNumberOrNull,
  parseStringList,
  canManageGym,
  findOwnedDocument
} = require("./ownerUtils");
const { hashPassword, generateTemporaryPassword } = require("../../utils/password");
const { buildCoachCode } = require("../../utils/entityCodes");

async function createCoach(req, res) {
  const {
    gymId,
    name,
    specialty,
    email,
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
    emergencyContact,
    dateOfBirth,
    certifications
  } = req.body || {};

  if (!gymId || !name || !specialty || !email) {
    return res.status(400).json({ message: "gymId, name, specialty, and email are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return res.status(400).json({ message: "A user with that email already exists" });
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(temporaryPassword),
    role: "coach",
    gym: gymId,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  const coach = new Coach({
    gym: gymId,
    user: user._id,
    name,
    specialty,
    members: 0,
    status: "active",
    email: normalizedEmail,
    certifications: certifications || "",
    dateOfBirth: parseDateOrNull(dateOfBirth),
    gender: gender || "",
    address: address || "",
    nationalId: nationalId || "",
    employeeCode: employeeCode || "",
    hireDate: parseDateOrNull(hireDate),
    employmentType: employmentType || "",
    salaryModel: salaryModel || "",
    baseSalary: Number(req.body.baseSalary) || 0,
    shiftSchedule: shiftSchedule || "",
    specializations: parseStringList(specializations),
    yearsOfExperience: parseNumberOrNull(yearsOfExperience),
    languages: parseStringList(languages),
    certificationExpiryDates: parseStringList(certificationExpiryDates),
    availableHours: availableHours || "",
    maxClientCapacity: parseNumberOrNull(maxClientCapacity),
    performanceNotes: performanceNotes || "",
    bankPaymentDetails: bankPaymentDetails || "",
    emergencyContact: emergencyContact || "",
    joinedAt: new Date(),
    avatar: avatarFromName(name)
  });
  coach.coachCode = buildCoachCode(coach._id);
  await coach.save();

  await User.findByIdAndUpdate(user._id, { coachProfile: coach._id });

  return res.status(201).json({
    id: coach._id,
    credentials: {
      role: "coach",
      email: normalizedEmail,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function updateCoach(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }

  const {
    name,
    specialty,
    email,
    status,
    members,
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
    emergencyContact,
    dateOfBirth,
    certifications
  } = req.body || {};

  if (name) {
    coach.name = name;
    coach.avatar = avatarFromName(name);
  }
  if (specialty) coach.specialty = specialty;
  if (certifications != null) coach.certifications = String(certifications);
  if (status) coach.status = status;
  if (members != null) coach.members = Number(members);
  if (gender != null) coach.gender = String(gender);
  if (address != null) coach.address = String(address);
  if (nationalId != null) coach.nationalId = String(nationalId);
  if (employeeCode != null) coach.employeeCode = String(employeeCode);
  if (hireDate !== undefined) coach.hireDate = parseDateOrNull(hireDate);
  if (employmentType != null) coach.employmentType = String(employmentType);
  if (salaryModel != null) coach.salaryModel = String(salaryModel);
  if (req.body.baseSalary != null) coach.baseSalary = Number(req.body.baseSalary) || 0;
  if (shiftSchedule != null) coach.shiftSchedule = String(shiftSchedule);
  if (specializations != null) coach.specializations = parseStringList(specializations);
  if (yearsOfExperience !== undefined) coach.yearsOfExperience = parseNumberOrNull(yearsOfExperience);
  if (languages != null) coach.languages = parseStringList(languages);
  if (certificationExpiryDates != null) coach.certificationExpiryDates = parseStringList(certificationExpiryDates);
  if (availableHours != null) coach.availableHours = String(availableHours);
  if (maxClientCapacity !== undefined) coach.maxClientCapacity = parseNumberOrNull(maxClientCapacity);
  if (performanceNotes != null) coach.performanceNotes = String(performanceNotes);
  if (bankPaymentDetails != null) coach.bankPaymentDetails = String(bankPaymentDetails);
  if (emergencyContact != null) coach.emergencyContact = String(emergencyContact);
  if (dateOfBirth !== undefined) coach.dateOfBirth = parseDateOrNull(dateOfBirth);

  if (email) {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: coach.user } }).lean();
    if (existingUser) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }
    coach.email = normalizedEmail;
  }

  await coach.save();

  if (coach.user) {
    await User.findByIdAndUpdate(coach.user, {
      name: coach.name,
      email: coach.email
    });
  }

  return res.json({ message: "Coach updated" });
}

async function deleteCoach(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }

  await Coach.findByIdAndDelete(req.params.id);
  if (coach?.user) {
    await User.findByIdAndDelete(coach.user);
  }
  return res.json({ message: "Coach removed" });
}

async function resetCoachPassword(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }
  if (!coach.user) {
    return res.status(404).json({ message: "Coach account is not linked to a login user" });
  }

  const user = await User.findById(coach.user);
  if (!user) {
    return res.status(404).json({ message: "Coach login account not found" });
  }

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordUpdatedAt = new Date();
  user.status = "active";
  await user.save();

  return res.json({
    message: "Coach password reset",
    credentials: {
      role: "coach",
      email: user.email,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

module.exports = {
  createCoach,
  updateCoach,
  deleteCoach,
  resetCoachPassword
};
