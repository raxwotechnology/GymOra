const mongoose = require("mongoose");

// Singleton document — always use SystemSettings.findOne() or SystemSettings.getSingleton()
const systemSettingsSchema = new mongoose.Schema(
  {
    systemName: { type: String, default: "Gymora" },
    tagline: { type: String, default: "Next Level Fitness ERP" },
    logoUrl: { type: String, default: "/gymora-logo.png" },
    faviconUrl: { type: String, default: "/gymora-logo.png" },
    supportEmail: { type: String, default: "support@gymora.io" },
    contactPhone: { type: String, default: "" },
    contactNumbers: { type: [String], default: [] },
    address: { type: String, default: "" },
    trialDays: { type: Number, default: 14 },
    privacyPolicy: { type: String, default: "" },
    termsOfUse: { type: String, default: "" },
    helpCenter: { type: String, default: "" },
    primaryColor: { type: String, default: "#2563eb" },
    heroImageUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne().lean();
  if (!doc) {
    doc = await this.create({});
    return doc.toObject ? doc.toObject() : doc;
  }
  return doc;
};

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
