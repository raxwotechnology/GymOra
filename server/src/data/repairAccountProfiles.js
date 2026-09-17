const User = require("../models/User");
const Coach = require("../models/Coach");
const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const { buildCoachCode, buildMemberCode } = require("../utils/entityCodes");

function avatarFromName(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NA";
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue || new Date());
  date.setMonth(date.getMonth() + (Number(months) || 1));
  return date;
}

async function repairAccountProfiles() {
  const [users, coaches, members, membershipPlans] = await Promise.all([
    User.find().sort({ createdAt: 1 }),
    Coach.find().sort({ createdAt: 1 }),
    Member.find().sort({ createdAt: 1 }),
    MembershipPlan.find().sort({ createdAt: 1 }).lean()
  ]);

  const coachesById = new Map(coaches.map((coach) => [String(coach._id), coach]));
  const membersById = new Map(members.map((member) => [String(member._id), member]));
  const plansByGym = membershipPlans.reduce((map, plan) => {
    const key = String(plan.gym || "");
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(plan);
    return map;
  }, new Map());

  let changed = 0;

  for (const coach of coaches) {
    if (!coach.coachCode) {
      coach.coachCode = buildCoachCode(coach._id);
      await coach.save();
      changed += 1;
    }
  }

  for (const member of members) {
    if (!member.memberCode) {
      member.memberCode = buildMemberCode(member._id);
      await member.save();
      changed += 1;
    }
  }

  const coachUsers = users.filter((user) => user.role === "coach");
  const memberUsers = users.filter((user) => user.role === "member");

  for (const user of coachUsers) {
    let coach =
      (user.coachProfile && coachesById.get(String(user.coachProfile))) ||
      coaches.find((item) => String(item.user || "") === String(user._id)) ||
      coaches.find((item) => String(item.gym || "") === String(user.gym || "") && String(item.email || "").toLowerCase() === String(user.email || "").toLowerCase()) ||
      null;

    if (!coach && user.gym) {
      coach = new Coach({
        gym: user.gym,
        user: user._id,
        name: user.name,
        specialty: "General Coaching",
        members: 0,
        status: user.status === "active" ? "active" : "inactive",
        email: user.email,
        joinedAt: user.createdAt || new Date(),
        avatar: avatarFromName(user.name)
      });
      coach.coachCode = buildCoachCode(coach._id);
      await coach.save();
      coaches.push(coach);
      coachesById.set(String(coach._id), coach);
      changed += 1;
    }

    if (!coach) {
      continue;
    }

    if (String(coach.user || "") !== String(user._id)) {
      coach.user = user._id;
      if (!coach.coachCode) {
        coach.coachCode = buildCoachCode(coach._id);
      }
      await coach.save();
      changed += 1;
    }

    if (String(user.coachProfile || "") !== String(coach._id) || String(user.gym || "") !== String(coach.gym || "")) {
      user.coachProfile = coach._id;
      if (!user.gym) {
        user.gym = coach.gym;
      }
      await user.save();
      changed += 1;
    }
  }

  for (const user of memberUsers) {
    let member =
      (user.memberProfile && membersById.get(String(user.memberProfile))) ||
      members.find((item) => String(item.user || "") === String(user._id)) ||
      members.find((item) => String(item.gym || "") === String(user.gym || "") && item.name === user.name) ||
      null;

    if (!member && user.gym && user.status === "active") {
      const gymPlans = plansByGym.get(String(user.gym || "")) || [];
      const firstPlan = gymPlans[0] || null;
      const joinedAt = user.createdAt || new Date();
      const durationMonths = Number(firstPlan?.durationMonths || 1);
      const amountDue = Number(firstPlan?.price || 0);

      member = new Member({
        gym: user.gym,
        user: user._id,
        name: user.name,
        coach: "Unassigned Coach",
        plan: firstPlan?.name || "Pending Plan",
        subscriptionDurationMonths: durationMonths,
        status: "active",
        joinedAt,
        planStartedAt: joinedAt,
        planExpiresAt: addMonths(joinedAt, durationMonths),
        checkIns: 0,
        goal: user.requestedGoal || "General Fitness",
        paymentStatus: amountDue > 0 ? "unpaid" : "paid",
        amountPaid: 0,
        amountDue,
        dietPlanName: "",
        avatar: avatarFromName(user.name),
        progress: 0
      });
      member.memberCode = buildMemberCode(member._id);
      await member.save();
      members.push(member);
      membersById.set(String(member._id), member);
      changed += 1;
    }

    if (!member) {
      continue;
    }

    if (String(member.user || "") !== String(user._id)) {
      member.user = user._id;
      if (!member.memberCode) {
        member.memberCode = buildMemberCode(member._id);
      }
      await member.save();
      changed += 1;
    }

    if (String(user.memberProfile || "") !== String(member._id) || String(user.gym || "") !== String(member.gym || "")) {
      user.memberProfile = member._id;
      if (!user.gym) {
        user.gym = member.gym;
      }
      await user.save();
      changed += 1;
    }
  }

  return { changed };
}

module.exports = repairAccountProfiles;
