const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

// Detect version from packages/cli/package.json
const cliPackagePath = path.resolve(__dirname, "../packages/cli/package.json");
let version = "unknown";

try {
  if (fs.existsSync(cliPackagePath)) {
    const pkg = require(cliPackagePath);
    version = pkg.version;
  } else {
    // Fallback or error
    console.warn(
      chalk.yellow(
        `Warning: Could not find packages/cli/package.json. Defaulting version to 'unknown'.`,
      ),
    );
  }
} catch (e) {
  console.warn(
    chalk.yellow(
      `Warning: Failed to read version from packages/cli/package.json: ${e.message}`,
    ),
  );
}

const REPORT_FILE = `release-reports/release-report-${version}.md`;
// Also check for 'v' prefix just in case user uses tags
const REPORT_FILE_V = `release-reports/release-report-v${version}.md`;
const TEMPLATE_FILE = "release-reports/TEMPLATE.md";
const CHANGELOG_FILE = "CHANGELOG.md";

console.log(chalk.blue(`🔍 Validating Release Report for v${version}...`));

// 1. Check if Report Exists
const activeReportPath = fs.existsSync(REPORT_FILE)
  ? REPORT_FILE
  : fs.existsSync(REPORT_FILE_V)
    ? REPORT_FILE_V
    : null;

if (!activeReportPath) {
  console.error(
    chalk.red(`\n❌ Error: Release Report for v${version} is missing!`),
  );
  console.log(
    chalk.yellow(`\nPlease create the report by copying the template:`),
  );
  console.log(chalk.dim(`  cp ${TEMPLATE_FILE} ${REPORT_FILE}`));
  console.log(
    chalk.dim("  Then fill it out with validation results and screenshots."),
  );
  process.exit(1);
}

const content = fs.readFileSync(activeReportPath, "utf-8");
const lines = content.split("\n");
let errors = [];

// 2. Check content validity
// Strict check: "Local Verification" section must be checked
const localVerificationRegex =
  /## 1\. Local Verification[\s\S]*?-\s*\[x\] \*\*Result\*\*: PASSED/i;
if (!localVerificationRegex.test(content)) {
  errors.push("Local Verification must be marked as PASSED.");
}

// Warn if file looks too short (empty template)
if (content.length < 200) {
  errors.push("Report looks too short. Did you fill it out?");
}

// 3. Check CHANGELOG.md
if (fs.existsSync(CHANGELOG_FILE)) {
  const changelogContent = fs.readFileSync(CHANGELOG_FILE, "utf-8");
  // Simple heuristic: Does it contain the version number?
  if (!changelogContent.includes(version)) {
    errors.push(
      `CHANGELOG.md does not appear to contain entry for v${version}`,
    );
  }
} else {
  console.warn(
    chalk.yellow("⚠️  CHANGELOG.md not found. Skipping changelog check."),
  );
}

if (errors.length > 0) {
  console.error(chalk.red(`\n❌ Release Validation Failed for v${version}:`));
  errors.forEach((err) => console.error(chalk.red(`  - ${err}`)));
  console.log(
    chalk.yellow(`\nPlease update ${activeReportPath} and/or CHANGELOG.md.`),
  );
  process.exit(1);
}

console.log(
  chalk.green(`✅ Release Report & Changelog Validated for v${version}!`),
);
