function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getMembershipExpiryDate(member) {
  return toValidDate(member?.planExpiresAt);
}

function isMembershipExpired(member, now = new Date()) {
  const expiryDate = getMembershipExpiryDate(member);
  if (!expiryDate) {
    return false;
  }

  return endOfDay(expiryDate).getTime() < now.getTime();
}

function deriveSubscriptionStatus(member, fallbackStatus = "active", now = new Date()) {
  return isMembershipExpired(member, now) ? "inactive" : fallbackStatus;
}

async function syncExpiredMemberStatus(member, now = new Date()) {
  if (!member) {
    return member;
  }

  if (!isMembershipExpired(member, now) || member.status === "inactive") {
    return member;
  }

  member.status = "inactive";
  await member.save();
  return member;
}

async function expireMembersByFilter(Model, filter = {}, now = new Date()) {
  const result = await Model.updateMany(
    {
      ...filter,
      status: "active",
      planExpiresAt: { $ne: null, $lt: now }
    },
    {
      $set: {
        status: "inactive"
      }
    }
  );

  return result.modifiedCount || 0;
}

module.exports = {
  deriveSubscriptionStatus,
  expireMembersByFilter,
  getMembershipExpiryDate,
  isMembershipExpired,
  syncExpiredMemberStatus
};
