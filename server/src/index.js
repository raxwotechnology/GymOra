const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = require("./app");
const connectDB = require("./config/db");
const seedDatabase = require("./data/seedDatabase");
const bootstrapSuperAdmin = require("./data/bootstrapSuperAdmin");
const repairAccountProfiles = require("./data/repairAccountProfiles");
const backfillDemoDetails = require("./data/backfillDemoDetails");
const seedMissingData = require("./data/seedMissingData");
const { registerTasks } = require("./tasks");
const { registerMessageSocket } = require("./sockets/messageSocket");

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
});

async function startServer() {
  try {
    await connectDB();
    const seeded = await seedDatabase();
    if (seeded) {
      console.log("[mongodb] Seeded initial Gymora data");
    }

    const bootstrappedAdmin = await bootstrapSuperAdmin();
    if (bootstrappedAdmin.created) {
      console.log(`[auth] Bootstrapped super-admin account for ${bootstrappedAdmin.email}`);
      const credFile = path.join(__dirname, "..", "super-admin-init.txt");
      fs.writeFileSync(credFile, `Gymora Super-Admin Initial Credentials\n\nEmail:    ${bootstrappedAdmin.email}\nPassword: ${bootstrappedAdmin.temporaryPassword}\n\nDelete this file after first login.\n`);
      console.log(`[auth] Initial credentials written to super-admin-init.txt — delete after first login.`);
    }

    const repairedProfiles = await repairAccountProfiles();
    if (repairedProfiles.changed) {
      console.log(`[auth] Repaired ${repairedProfiles.changed} coach/member profile records`);
    }

    const demoBackfill = await backfillDemoDetails();
    if (demoBackfill.changed) {
      console.log(`[demo] Backfilled demo details for ${demoBackfill.changed} records`);
    }

    const missingData = await seedMissingData();
    if (missingData.changed) {
      console.log(`[demo] Seeded missing collections/fields: ${missingData.changed} records`);
    }

    registerTasks();
    registerMessageSocket(io);
    httpServer.listen(PORT, () => {
      console.log(`[server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[server] Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
