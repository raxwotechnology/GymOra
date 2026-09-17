const MembershipPlan = require("../../models/MembershipPlan");
const WorkoutPlan = require("../../models/WorkoutPlan");
const MealPlan = require("../../models/MealPlan");
const Member = require("../../models/Member");
const Announcement = require("../../models/Announcement");
const {
  canManageGym, findOwnedDocument, parseStringList, parseMealItems,
  buildWorkoutExercises, parsePlanExercises, getRandomMembershipPlanColor,
  mapWorkoutPlanAuditSnapshot, mapMealPlanAuditSnapshot, logCoachActivity
} = require("./ownerUtils");

async function createMembershipPlan(req, res) {
  const { gymId, name, durationMonths, price, features, description, maxMembers, accessHours, sessionsPerWeek, trialDays, setupFee, discountPercent, isActive, color } = req.body || {};

  if (!gymId || !name || price == null) {
    return res.status(400).json({ message: "gymId, name, and price are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await MembershipPlan.create({
    gym: gymId,
    name,
    durationMonths: Number(durationMonths || 1),
    price: Number(price),
    features: parseStringList(features),
    color: color || getRandomMembershipPlanColor(),
    description: String(description || "").trim(),
    maxMembers: Number(maxMembers || 0),
    accessHours: String(accessHours || "").trim(),
    sessionsPerWeek: Number(sessionsPerWeek || 0),
    trialDays: Number(trialDays || 0),
    setupFee: Number(setupFee || 0),
    discountPercent: Number(discountPercent || 0),
    isActive: isActive !== false && isActive !== "false"
  });

  return res.status(201).json({ id: plan._id });
}

async function updateMembershipPlan(req, res) {
  const plan = await findOwnedDocument(MembershipPlan, req, req.params.id);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this membership plan" });
  if (!plan) return res.status(404).json({ message: "Membership plan not found" });

  const { name, durationMonths, price, features, description, maxMembers, accessHours, sessionsPerWeek, trialDays, setupFee, discountPercent, isActive, color } = req.body || {};

  if (name) plan.name = name;
  if (durationMonths != null) plan.durationMonths = Number(durationMonths);
  if (price != null) plan.price = Number(price);
  if (features != null) plan.features = parseStringList(features);
  if (color) plan.color = color;
  if (description != null) plan.description = String(description).trim();
  if (maxMembers != null) plan.maxMembers = Number(maxMembers);
  if (accessHours != null) plan.accessHours = String(accessHours).trim();
  if (sessionsPerWeek != null) plan.sessionsPerWeek = Number(sessionsPerWeek);
  if (trialDays != null) plan.trialDays = Number(trialDays);
  if (setupFee != null) plan.setupFee = Number(setupFee);
  if (discountPercent != null) plan.discountPercent = Number(discountPercent);
  if (isActive != null) plan.isActive = isActive !== false && isActive !== "false";

  await plan.save();
  return res.json({ message: "Membership plan updated" });
}

async function createWorkoutPlan(req, res) {
  const { gymId, name, level, duration, days, category, description, exercises } = req.body || {};

  if (!gymId || !name || !level || !duration || !days || !category) {
    return res.status(400).json({ message: "gymId, name, level, duration, days, and category are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await WorkoutPlan.create({
    gym: gymId, name, level, duration, days: Number(days), category,
    description: String(description || "").trim(),
    exercises: parsePlanExercises(exercises)
  });

  await logCoachActivity(req, {
    action: "create", targetType: "workout-plan", targetId: plan._id, targetName: plan.name,
    summary: `Created workout plan ${plan.name}`, after: mapWorkoutPlanAuditSnapshot(plan)
  });

  return res.status(201).json({ id: plan._id });
}

async function updateWorkoutPlan(req, res) {
  const plan = await findOwnedDocument(WorkoutPlan, req, req.params.id);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this workout plan" });
  if (!plan) return res.status(404).json({ message: "Workout plan not found" });

  const before = mapWorkoutPlanAuditSnapshot(plan);
  const { name, level, duration, days, category, description, exercises } = req.body || {};

  if (name) plan.name = name;
  if (level) plan.level = level;
  if (duration) plan.duration = duration;
  if (days != null) plan.days = Number(days);
  if (category) plan.category = category;
  if (description != null) plan.description = String(description).trim();
  if (exercises != null) plan.exercises = parsePlanExercises(exercises);

  await plan.save();

  await logCoachActivity(req, {
    action: "update", targetType: "workout-plan", targetId: plan._id, targetName: plan.name,
    summary: `Updated workout plan ${plan.name}`, before, after: mapWorkoutPlanAuditSnapshot(plan)
  });

  return res.json({ message: "Workout plan updated" });
}

async function deleteWorkoutPlan(req, res) {
  const plan = await findOwnedDocument(WorkoutPlan, req, req.params.id);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this workout plan" });
  if (!plan) return res.status(404).json({ message: "Workout plan not found" });

  const snapshot = mapWorkoutPlanAuditSnapshot(plan);
  await WorkoutPlan.findByIdAndDelete(plan._id);

  await logCoachActivity(req, {
    action: "delete", targetType: "workout-plan", targetId: plan._id, targetName: plan.name,
    summary: `Deleted workout plan ${plan.name}`, before: snapshot
  });

  return res.json({ message: "Workout plan deleted" });
}

async function assignWorkoutPlanToMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to assign workout plans to this member" });
  }

  const { workoutPlanId } = req.body || {};
  if (!workoutPlanId) return res.status(400).json({ message: "workoutPlanId is required" });

  const plan = await findOwnedDocument(WorkoutPlan, req, workoutPlanId);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this workout plan" });
  if (!plan) return res.status(404).json({ message: "Workout plan not found" });

  const before = member.myWorkoutPlan
    ? { name: member.myWorkoutPlan.name || "", week: Number(member.myWorkoutPlan.week || 0), totalWeeks: Number(member.myWorkoutPlan.totalWeeks || 0), day: member.myWorkoutPlan.today?.day || "" }
    : null;

  const planHasExercises = Array.isArray(plan.exercises) && plan.exercises.length > 0;
  const exercisesForMember = planHasExercises
    ? plan.exercises.map((ex) => ({
      name: ex.name, sets: ex.sets || 3, reps: ex.reps || "10", rest: ex.rest || "60 sec",
      done: false, loggedWeight: "", completionNotes: "", completedAt: null
    }))
    : buildWorkoutExercises(plan);

  member.myWorkoutPlan = {
    name: plan.name, week: 1, totalWeeks: Math.max(1, Number(plan.days || 1)),
    today: { day: `${plan.category} Day`, exercises: exercisesForMember }
  };

  await member.save();

  await logCoachActivity(req, {
    action: "assign-workout-plan", targetType: "member", targetId: member._id, targetName: member.name,
    summary: `Assigned workout plan ${plan.name} to ${member.name}`,
    before,
    after: { name: member.myWorkoutPlan.name, week: member.myWorkoutPlan.week, totalWeeks: member.myWorkoutPlan.totalWeeks, day: member.myWorkoutPlan.today?.day || "" },
    metadata: { workoutPlanId: plan._id, workoutPlanName: plan.name }
  });

  return res.json({ message: "Workout plan assigned to member" });
}

async function removeWorkoutPlanFromMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to remove workout plans from this member" });
  }

  const before = member.myWorkoutPlan
    ? { name: member.myWorkoutPlan.name || "", week: Number(member.myWorkoutPlan.week || 0), totalWeeks: Number(member.myWorkoutPlan.totalWeeks || 0), day: member.myWorkoutPlan.today?.day || "" }
    : null;

  member.myWorkoutPlan = null;
  await member.save();

  await logCoachActivity(req, {
    action: "remove-workout-plan", targetType: "member", targetId: member._id, targetName: member.name,
    summary: `Removed workout plan from ${member.name}`, before, after: null
  });

  return res.json({ message: "Workout plan removed from member" });
}

async function createMealPlan(req, res) {
  const { gymId, name, calories, protein, carbs, fat, goal, meals } = req.body || {};

  if (!gymId || !name || calories == null || protein == null || carbs == null || fat == null || !goal) {
    return res.status(400).json({ message: "gymId, name, calories, protein, carbs, fat, and goal are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await MealPlan.create({
    gym: gymId, name, calories: Number(calories), protein: Number(protein),
    carbs: Number(carbs), fat: Number(fat), goal, meals: parseMealItems(meals)
  });

  await logCoachActivity(req, {
    action: "create", targetType: "meal-plan", targetId: plan._id, targetName: plan.name,
    summary: `Created meal plan ${plan.name}`, after: mapMealPlanAuditSnapshot(plan)
  });

  return res.status(201).json({ id: plan._id });
}

async function updateMealPlan(req, res) {
  const plan = await findOwnedDocument(MealPlan, req, req.params.id);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this meal plan" });
  if (!plan) return res.status(404).json({ message: "Meal plan not found" });

  const before = mapMealPlanAuditSnapshot(plan);
  const { name, calories, protein, carbs, fat, goal, meals } = req.body || {};

  if (name) plan.name = name;
  if (calories != null) plan.calories = Number(calories);
  if (protein != null) plan.protein = Number(protein);
  if (carbs != null) plan.carbs = Number(carbs);
  if (fat != null) plan.fat = Number(fat);
  if (goal) plan.goal = goal;
  if (meals != null) plan.meals = parseMealItems(meals);

  await plan.save();

  await logCoachActivity(req, {
    action: "update", targetType: "meal-plan", targetId: plan._id, targetName: plan.name,
    summary: `Updated meal plan ${plan.name}`, before, after: mapMealPlanAuditSnapshot(plan)
  });

  return res.json({ message: "Meal plan updated" });
}

async function deleteMealPlan(req, res) {
  const plan = await findOwnedDocument(MealPlan, req, req.params.id);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this meal plan" });
  if (!plan) return res.status(404).json({ message: "Meal plan not found" });

  const snapshot = mapMealPlanAuditSnapshot(plan);
  await MealPlan.findByIdAndDelete(plan._id);

  await logCoachActivity(req, {
    action: "delete", targetType: "meal-plan", targetId: plan._id, targetName: plan.name,
    summary: `Deleted meal plan ${plan.name}`, before: snapshot
  });

  return res.json({ message: "Meal plan deleted" });
}

async function assignMealPlanToMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to assign meal plans to this member" });
  }

  const { mealPlanId } = req.body || {};
  if (!mealPlanId) return res.status(400).json({ message: "mealPlanId is required" });

  const plan = await findOwnedDocument(MealPlan, req, mealPlanId);
  if (plan === "forbidden") return res.status(403).json({ message: "You do not have access to this meal plan" });
  if (!plan) return res.status(404).json({ message: "Meal plan not found" });

  const before = member.myMealPlan
    ? { name: member.myMealPlan.name || "", meals: Array.isArray(member.myMealPlan.meals) ? member.myMealPlan.meals : [] }
    : null;

  member.dietPlanName = plan.name;
  member.myMealPlan = {
    name: plan.name,
    meals: Array.isArray(plan.meals)
      ? plan.meals.map((meal) => ({
        time: meal.time || "", name: meal.name || "",
        foods: Array.isArray(meal.foods) ? meal.foods : [],
        cals: Number(meal.cals || 0), protein: Number(meal.protein || 0),
        carbs: Number(meal.carbs || 0), fat: Number(meal.fat || 0)
      }))
      : []
  };

  await member.save();

  await logCoachActivity(req, {
    action: "assign-meal-plan", targetType: "member", targetId: member._id, targetName: member.name,
    summary: `Assigned meal plan ${plan.name} to ${member.name}`,
    before, after: { name: member.myMealPlan.name, meals: member.myMealPlan.meals },
    metadata: { mealPlanId: plan._id, mealPlanName: plan.name }
  });

  return res.json({ message: "Meal plan assigned to member" });
}

async function removeMealPlanFromMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") return res.status(403).json({ message: "You do not have access to this member" });
  if (!member) return res.status(404).json({ message: "Member not found" });

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to remove meal plans from this member" });
  }

  const before = member.myMealPlan
    ? { name: member.myMealPlan.name || "", meals: Array.isArray(member.myMealPlan.meals) ? member.myMealPlan.meals : [] }
    : null;

  member.dietPlanName = "";
  member.myMealPlan = null;
  await member.save();

  await logCoachActivity(req, {
    action: "remove-meal-plan", targetType: "member", targetId: member._id, targetName: member.name,
    summary: `Removed meal plan from ${member.name}`, before, after: null
  });

  return res.json({ message: "Meal plan removed from member" });
}

async function createAnnouncement(req, res) {
  const { gymId, title, body, priority, audience, targetMemberIds, targetCoachIds, expiresAt, pinned, imageUrl, ctaLabel, ctaUrl } = req.body || {};

  if (!gymId || !title || !body || !priority) {
    return res.status(400).json({ message: "gymId, title, body, and priority are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const announcement = await Announcement.create({
    gym: gymId,
    title,
    body,
    priority,
    date: new Date(),
    audience: audience || "all",
    targetMemberIds: Array.isArray(targetMemberIds) ? targetMemberIds : [],
    targetCoachIds: Array.isArray(targetCoachIds) ? targetCoachIds : [],
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    pinned: pinned === true || pinned === "true",
    imageUrl: imageUrl || "",
    ctaLabel: ctaLabel || "",
    ctaUrl: ctaUrl || ""
  });
  return res.status(201).json({ id: announcement._id });
}

async function updateAnnouncement(req, res) {
  const announcement = await findOwnedDocument(Announcement, req, req.params.id);
  if (announcement === "forbidden") return res.status(403).json({ message: "You do not have access to this announcement" });
  if (!announcement) return res.status(404).json({ message: "Announcement not found" });

  const { title, body, priority, audience, targetMemberIds, targetCoachIds, expiresAt, pinned, imageUrl, ctaLabel, ctaUrl } = req.body || {};
  if (title) announcement.title = title;
  if (body) announcement.body = body;
  if (priority) announcement.priority = priority;
  if (audience) announcement.audience = audience;
  if (targetMemberIds !== undefined) announcement.targetMemberIds = Array.isArray(targetMemberIds) ? targetMemberIds : [];
  if (targetCoachIds !== undefined) announcement.targetCoachIds = Array.isArray(targetCoachIds) ? targetCoachIds : [];
  if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (pinned !== undefined) announcement.pinned = pinned === true || pinned === "true";
  if (imageUrl !== undefined) announcement.imageUrl = imageUrl;
  if (ctaLabel !== undefined) announcement.ctaLabel = ctaLabel;
  if (ctaUrl !== undefined) announcement.ctaUrl = ctaUrl;
  announcement.date = new Date();

  await announcement.save();
  return res.json({ message: "Announcement updated" });
}

async function deleteAnnouncement(req, res) {
  const announcement = await findOwnedDocument(Announcement, req, req.params.id);
  if (announcement === "forbidden") return res.status(403).json({ message: "You do not have access to this announcement" });
  if (!announcement) return res.status(404).json({ message: "Announcement not found" });

  await Announcement.findByIdAndDelete(req.params.id);
  return res.json({ message: "Announcement deleted" });
}

module.exports = {
  createMembershipPlan, updateMembershipPlan,
  createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
  assignWorkoutPlanToMember, removeWorkoutPlanFromMember,
  createMealPlan, updateMealPlan, deleteMealPlan,
  assignMealPlanToMember, removeMealPlanFromMember,
  createAnnouncement, updateAnnouncement, deleteAnnouncement
};
