/**
 * seedCoachAttendance.js
 * Adds 90 days of realistic coach attendance demo data.
 * Safe to re-run — skips any (coach, date) pair that already exists.
 *
 * Run: node server/src/data/seedCoachAttendance.js
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const CoachAttendance = require("../models/CoachAttendance");
const Coach = require("../models/Coach");
const Gym = require("../models/Gym");

const DAYS_BACK = 90;

// Shift patterns per coach index
const SHIFTS = [
  { start: 6,  end: 14 }, // morning
  { start: 14, end: 22 }, // evening
  { start: 7,  end: 15 }, // morning-offset
  { start: 9,  end: 17 }, // day
  { start: 13, end: 21 }, // late afternoon
];

// Leave probability per day of week (0=Sun skip, 1=Mon low, ..., 6=Sat medium)
const LEAVE_CHANCE = [1, 0.06, 0.06, 0.08, 0.08, 0.10, 0.15];

function dateAtMidnight(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

function atHour(baseDate, hour, minute, jitterMin = 0) {
  const d = new Date(baseDate);
  d.setHours(hour, minute + Math.floor(Math.random() * jitterMin), Math.floor(Math.random() * 59), 0);
  return d;
}

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub";
  await mongoose.connect(uri);
  console.log("Connected.");

  const gyms = await Gym.find().lean();
  if (gyms.length === 0) { console.log("No gyms found."); process.exit(0); }

  let totalInserted = 0;

  for (const gym of gyms) {
    const coaches = await Coach.find({ gym: gym._id }).lean();
    if (coaches.length === 0) { console.log(`  ${gym.name}: no coaches, skipping.`); continue; }

    // Build a set of existing (coachId-dateStr) to avoid duplicates
    const existing = await CoachAttendance.find({ gym: gym._id }, { coach: 1, date: 1 }).lean();
    const existingSet = new Set(existing.map((r) => `${r.coach}-${new Date(r.date).toISOString().slice(0, 10)}`));

    const records = [];

    for (let daysBack = DAYS_BACK; daysBack >= 0; daysBack--) {
      const baseDate = dateAtMidnight(daysBack);
      const dow = baseDate.getDay(); // 0=Sun
      if (dow === 0) continue; // always skip Sunday

      for (let ci = 0; ci < coaches.length; ci++) {
        const coach = coaches[ci];
        const dateKey = `${coach._id}-${baseDate.toISOString().slice(0, 10)}`;
        if (existingSet.has(dateKey)) continue;

        // Random leave
        if (Math.random() < LEAVE_CHANCE[dow]) continue;

        const shift = SHIFTS[ci % SHIFTS.length];
        const isToday = daysBack === 0;

        const clockIn = atHour(baseDate, shift.start, 0, 10); // up to 10 min jitter

        // Break: 70% of shifts have a break
        const hasBreak = Math.random() < 0.70;
        const breakStart = hasBreak ? atHour(baseDate, shift.start + 3, 30, 15) : null;
        const breakEnd = hasBreak ? atHour(baseDate, shift.start + 3, 55, 15) : null;

        let clockOut, status, totalWorkMinutes, breakMinutes;

        if (isToday && ci === 0) {
          // First coach is still clocked in today
          clockOut = null;
          status = "clocked-in";
          totalWorkMinutes = 0;
          breakMinutes = 0;
        } else if (isToday && ci === 1 && hasBreak) {
          // Second coach is on break today
          clockOut = null;
          status = "on-break";
          totalWorkMinutes = 0;
          breakMinutes = 0;
        } else {
          clockOut = atHour(baseDate, shift.end, 0, 10);
          status = "clocked-out";

          const totalMs = clockOut.getTime() - clockIn.getTime();
          const breakMs = hasBreak
            ? Math.max(0, breakEnd.getTime() - breakStart.getTime())
            : 0;
          breakMinutes = Math.round(breakMs / 60000);
          totalWorkMinutes = Math.max(0, Math.round((totalMs - breakMs) / 60000));
        }

        records.push({
          gym: gym._id,
          coach: coach._id,
          coachName: coach.name,
          date: baseDate,
          clockIn,
          clockOut,
          breakStart,
          breakEnd,
          totalWorkMinutes,
          breakMinutes,
          status,
        });

        existingSet.add(dateKey); // prevent duplicates within this batch
      }
    }

    if (records.length > 0) {
      await CoachAttendance.insertMany(records);
      console.log(`  ${gym.name}: inserted ${records.length} records.`);
      totalInserted += records.length;
    } else {
      console.log(`  ${gym.name}: nothing new to insert.`);
    }
  }

  console.log(`\nDone. Total inserted: ${totalInserted}`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
