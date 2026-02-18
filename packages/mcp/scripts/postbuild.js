const fs = require("fs");
const path = require("path");

const distFile = path.join(__dirname, "dist", "index.js");
if (!fs.existsSync(distFile)) {
  console.error("dist/index.js not found");
  process.exit(1);
}

let content = fs.readFileSync(distFile, "utf8");
const shebang = "#!/usr/bin/env node\n";

if (!content.startsWith(shebang)) {
  console.log("Adding shebang to dist/index.js");
  content = shebang + content;
  fs.writeFileSync(distFile, content);
}

try {
  fs.chmodSync(distFile, 0o755);
  console.log("Set executable permissions for dist/index.js");
} catch (err) {
  console.warn("Could not set executable permissions:", err.message);
}
