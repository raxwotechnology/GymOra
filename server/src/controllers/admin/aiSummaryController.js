const { GoogleGenerativeAI } = require("@google/generative-ai");
const Gym = require("../../models/Gym");
const Member = require("../../models/Member");
const Coach = require("../../models/Coach");
const Attendance = require("../../models/Attendance");

async function generateAiSummary(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  const now = new Date();
  const [gyms, members, coaches, recentAttendance] = await Promise.all([
    Gym.find().lean(),
    Member.find().lean(),
    Coach.find().lean(),
    Attendance.find({ date: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }).lean()
  ]);

  const activeGyms = gyms.filter((g) => g.status === "active");
  const trialGyms = gyms.filter((g) => g.status === "trial");
  const suspendedGyms = gyms.filter((g) => g.status === "suspended");

  const totalRevenue = gyms.reduce((sum, g) => {
    const history = g.revenueHistory || [];
    return sum + history.reduce((s, p) => s + (p.value || 0), 0);
  }, 0);

  const latestMonth = (() => {
    const allMonths = new Set();
    gyms.forEach((g) => (g.revenueHistory || []).forEach((p) => allMonths.add(p.month)));
    const sorted = Array.from(allMonths).sort();
    return sorted[sorted.length - 1] || null;
  })();

  const monthlyRevenue = latestMonth
    ? gyms.reduce((sum, g) => {
        const point = (g.revenueHistory || []).find((p) => p.month === latestMonth);
        return sum + (point ? point.value : 0);
      }, 0)
    : 0;

  const activeMembers = members.filter((m) => m.status === "active").length;
  const expiredMembers = members.filter((m) => m.status === "expired").length;

  const trialEndingSoon = trialGyms.filter((g) => {
    if (!g.trialEndsAt) return false;
    const daysLeft = Math.ceil((new Date(g.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft >= 0;
  }).length;

  const gymAttendanceMap = {};
  recentAttendance.forEach((a) => {
    const gid = String(a.gym);
    gymAttendanceMap[gid] = (gymAttendanceMap[gid] || 0) + 1;
  });
  const inactiveGyms = activeGyms.filter((g) => !gymAttendanceMap[String(g._id)]).length;

  const prompt = `You are a business intelligence analyst for FitnessHub, a gym management SaaS platform.
Analyze the platform data below and return a JSON object with exactly these four keys:

{
  "platformHealth": "2-3 sentence paragraph about overall platform health and growth",
  "revenuePerformance": "2-3 sentence paragraph about revenue performance and trends",
  "riskAreas": ["short risk item 1", "short risk item 2", ...],
  "recommendedActions": ["short action item 1", "short action item 2", ...]
}

Platform Snapshot:
- Total gyms: ${gyms.length} (${activeGyms.length} active, ${trialGyms.length} trial, ${suspendedGyms.length} suspended)
- Trial gyms ending in ≤7 days: ${trialEndingSoon}
- Active gyms with NO attendance in last 7 days: ${inactiveGyms}
- Total members: ${members.length} (${activeMembers} active, ${expiredMembers} expired)
- Total coaches: ${coaches.length}
- Cumulative platform revenue: LKR ${totalRevenue.toLocaleString()}
- Latest monthly revenue: LKR ${monthlyRevenue.toLocaleString()}

Rules:
- riskAreas: 2–5 items, each under 12 words, focus on real threats
- recommendedActions: 3–5 items, each under 15 words, concrete and actionable
- paragraphs: professional, direct, no fluff
- Return valid JSON only, no markdown fences`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { platformHealth: raw, revenuePerformance: "", riskAreas: [], recommendedActions: [] };
  }

  res.json({ summary: parsed, generatedAt: now.toISOString() });
}

module.exports = { generateAiSummary };
