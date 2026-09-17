const fs = require("fs");
const path = require("path");
const os = require("os");

function getUploadDir(subfolder) {
  const localDir = path.join(__dirname, "..", "..", "uploads", subfolder);
  try {
    fs.mkdirSync(localDir, { recursive: true });
    return localDir;
  } catch (_err) {
    const tmpDir = path.join(os.tmpdir(), "uploads", subfolder);
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (_tmpErr) {}
    return tmpDir;
  }
}

module.exports = { getUploadDir };
