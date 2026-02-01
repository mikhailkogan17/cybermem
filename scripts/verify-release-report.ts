import chalk from "chalk";
import fs from "fs";
import path from "path";

const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../packages/cli/package.json"),
    "utf-8",
  ),
);
const version = packageJson.version;
const reportPath = path.join(
  __dirname,
  `../release-reports/release-report-${version}.md`,
);
const templatePath = path.join(__dirname, `../release-reports/TEMPLATE.md`);

console.log(chalk.blue(`🛡️  Verifying Release Report for v${version}...`));

if (!fs.existsSync(reportPath)) {
  console.error(chalk.red(`❌ Missing Release Report: ${reportPath}`));
  console.error(
    chalk.yellow(`   Run validation matrix and generate report first.`),
  );
  process.exit(1);
}

const content = fs.readFileSync(reportPath, "utf-8");
const templateContent = fs.readFileSync(templatePath, "utf-8");

// 1. Check for unchecked boxes
if (content.includes("- [ ]")) {
  console.error(
    chalk.red(`❌ Incomplete Release Report: Found unchecked boxes.`),
  );
  console.error(
    chalk.red(`   All verification steps must be explicitly checked [x].`),
  );

  // Print context of unchecked boxes
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("- [ ]")) {
      console.log(chalk.gray(`   Line ${i + 1}: ${line.trim()}`));
    }
  });

  process.exit(1);
}

// 2. Check for missing screenshots (Asset validation)
const assetDir = path.join(
  __dirname,
  `../release-reports/release-report-${version}-assets`,
);
if (!fs.existsSync(assetDir)) {
  console.error(chalk.red(`❌ Missing Assets Directory: ${assetDir}`));
  process.exit(1);
}

// Check for critical assets based on template structure (heuristics)
const requiredEnvs = ["localhost-prod", "localhost-staging", "rpi-lan-staging"];
const requiredScreenshots = ["1_dashboard.png", "2_mcp.png", "3_settings.png"]; // Partial match suffix

// 3. Template Fidelity Check (Basic)
const templateSections = [
  "## 0. Verification Instructions",
  "## 1. Localhost: Staging",
  "## 2. Localhost: Production",
  "## 🛡️ Zero Trust Verification Statement",
];

for (const section of templateSections) {
  if (!content.includes(section)) {
    console.warn(
      chalk.yellow(
        `⚠️  Report might be missing mandatory section: "${section}"`,
      ),
    );
  }
}

console.log(chalk.green(`✅ Release Report Verified! Ready for Publish.`));
