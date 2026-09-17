const { formatDate, formatDateTime, formatTime, mapCoach, mapMember, mapAttendance, mapAuditLog, buildFinancialSummary, buildAnnouncementNotifications, buildExpiringPlanNotifications, buildPendingPaymentNotifications, buildMissedCheckInNotifications, buildEquipmentNotifications, buildLowStockNotifications } = require("./dashboardUtils");

async function handleOwner(req, res, sharedData) {
  const { gym, coaches: coachesWithImages, members: membersWithImages, plans, equipment, announcements, workoutPlans, mealPlans, messages, attendance, expenses, supplements, sales, returns, pendingUsers, auditLogs, memberImageByMemberId, user, subscriptionPlans } = sharedData;
  const role = user.role;

  const activeMembers = membersWithImages.filter((member) => member.status === "active").length;
    const latestRevenue = gym.revenueHistory[gym.revenueHistory.length - 1]?.value || 0;
    const financials = buildFinancialSummary(gym, membersWithImages, expenses, sales, returns);
    const notifications = [
      ...buildAnnouncementNotifications(announcements, "owner-announcement"),
      ...buildExpiringPlanNotifications(membersWithImages, "owner-plan"),
      ...buildPendingPaymentNotifications(membersWithImages, "owner-payment"),
      ...buildMissedCheckInNotifications(membersWithImages, attendance, "owner-checkin"),
      ...buildEquipmentNotifications(equipment, "owner-equipment"),
      ...buildLowStockNotifications(supplements, "owner-supplement")
    ].slice(0, 12);

    return res.json({
      readNotificationIds: Array.isArray(user.readNotificationIds) ? user.readNotificationIds : [],
      profile: {
        role,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        bio: user.bio || "",
        title: user.title || "Gym Owner",
        profileImageUrl: user.profileImageUrl || "",
        gymName: gym.name,
        location: gym.location,
        plan: gym.plan,
        joined: formatDate(gym.joinedAt),
        subscriptionStatus: gym.status,
        subscriptionEndsAt: gym.subscriptionEndsAt || null,
        subscriptionPlanId: gym.subscriptionPlanId ? String(gym.subscriptionPlanId) : null
      },
      availableSubscriptionPlans: (subscriptionPlans || []).map((p) => ({
        id: String(p._id),
        name: p.name,
        price: p.price,
        billingCycle: p.billingCycle,
        features: p.features || [],
        color: p.color || "#2563eb",
        description: p.description || ""
      })),
      notifications,
      currentGym: {
        id: gym._id,
        name: gym.name,
        owner: gym.ownerName,
        logoUrl: gym.logoUrl || "",
        stats: {
          totalMembers: membersWithImages.length,
          activeMembers,
          coaches: coachesWithImages.length,
          monthlyRevenue: latestRevenue,
          checkInsToday: attendance.filter((item) => item.date === "Today" || formatDate(item.sessionDate) === formatDate(new Date())).length,
          newThisMonth: membersWithImages.filter((member) => new Date(member.joinedAt).getMonth() === new Date().getMonth()).length
        }
      },
      coaches: coachesWithImages.map(mapCoach),
      members: membersWithImages.map(mapMember),
      pendingMemberRequests: pendingUsers.map((item) => ({
        id: item._id,
        name: item.name,
        email: item.email,
        phone: item.phone || "",
        goal: item.requestedGoal || "",
        requestedAt: formatDate(item.createdAt)
      })),
      equipment: equipment.map((item) => ({
        id: item._id,
        name: item.name,
        qty: item.qty,
        status: item.status,
        lastService: formatDate(item.lastService),
        nextServiceDate: formatDate(item.nextServiceDate || new Date(new Date(item.lastService).getFullYear(), new Date(item.lastService).getMonth() + 3, new Date(item.lastService).getDate()))
      })),
      membershipPlans: plans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        durationMonths: plan.durationMonths || 1,
        price: plan.price,
        features: plan.features,
        color: plan.color,
        description: plan.description || "",
        maxMembers: plan.maxMembers || 0,
        accessHours: plan.accessHours || "",
        sessionsPerWeek: plan.sessionsPerWeek || 0,
        trialDays: plan.trialDays || 0,
        setupFee: plan.setupFee || 0,
        discountPercent: plan.discountPercent || 0,
        isActive: plan.isActive !== false
      })),
      announcements: announcements.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        date: formatDate(item.date),
        priority: item.priority
      })),
      attendance: attendance.map((item) =>
        mapAttendance({
          ...item,
          profileImageUrl: memberImageByMemberId.get(String(item.memberId || "")) || ""
        })
      ),
      expenses: expenses.map((item) => ({
        id: item._id,
        type: item.type || "expense",
        sourceType: item.sourceType || "manual",
        title: item.title,
        category: item.category,
        amount: item.amount,
        status: item.status,
        vendor: item.vendor,
        contactName: item.contactName || "",
        paymentMethod: item.paymentMethod || "",
        referenceNumber: item.referenceNumber || "",
        notes: item.notes,
        expenseDate: formatDate(item.expenseDate)
      })),
      supplements: supplements.map((item) => ({
        id: item._id,
        name: item.name,
        sku: item.sku,
        brand: item.brand,
        category: item.category,
        imageUrl: item.imageUrl || "",
        stockQty: item.stockQty,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        status: item.status
      })),
      sales: sales.map((item) => {
        const firstItem = item.items?.[0] || {};
        return {
          id: item._id,
          customerName: item.customerName,
          memberName: item.memberName,
          paymentMethod: item.paymentMethod,
          status: item.status,
          subtotal: item.subtotal,
          total: item.total,
          returnAmount: item.returnAmount,
          notes: item.notes || "",
          soldAt: item.soldAt ? item.soldAt.toISOString() : null,
          supplementName: firstItem.name || "",
          supplementId: firstItem.supplement ? String(firstItem.supplement) : "",
          qty: firstItem.qty || 1,
          unitPrice: firstItem.unitPrice || 0,
          itemCount: item.items?.length || 0,
          items: item.items
        };
      }),
      returns: returns.map((item) => {
        const firstItem = item.items?.[0] || {};
        return {
          id: item._id,
          saleId: item.sale,
          customerName: item.customerName,
          reason: item.reason,
          amount: item.amount,
          processedAt: item.processedAt ? item.processedAt.toISOString() : null,
          supplementName: firstItem.name || "",
          qty: firstItem.qty || 1,
          items: item.items
        };
      }),
      activityLogs: auditLogs.map(mapAuditLog),
      financials,
      revenueData: {
        months: gym.revenueHistory.map((point) => point.month),
        values: gym.revenueHistory.map((point) => point.value)
      },
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
      }))
    });
}

module.exports = { handleOwner };
