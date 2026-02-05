import { danger, fail, warn } from "danger";

// 1. Verify PR Description and Template Usage
const isPR = danger.github && danger.github.pr;
const body = isPR ? danger.github.pr.body : "";
const isFeature = danger.github.pr.title.startsWith("feat");
const isFix = danger.github.pr.title.startsWith("fix");

const fs = require("fs");

/**
 * Validates that the PR body contains all required headers from the template.
 */
function validateTemplate(type, body) {
  const templatePath = `.github/PULL_REQUEST_TEMPLATE/${type}.md`;
  if (!fs.existsSync(templatePath)) {
    warn(
      `Expected PR template not found at "${templatePath}". ` +
        "Please verify that the PR template exists and is correctly configured.",
    );
    return;
  }

  const templateContent = fs.readFileSync(templatePath, "utf8");
  // Extract headers (lines starting with #)
  const requiredHeaders = templateContent
    .split("\n")
    .filter((line) => line.startsWith("#"))
    .map((line) => line.trim());

  const missingHeaders = requiredHeaders.filter(
    (header) => !body.includes(header),
  );

  if (missingHeaders.length > 0) {
    const templateForUser = templateContent
      .replace(/^---[\s\S]*?---\n/, "")
      .trim();
    fail(
      `🚫 **Missing required headers from ${type} template**:\n` +
        missingHeaders.map((h) => `- ${h}`).join("\n") +
        `\n\n` +
        `Please ensure your PR description matches the standard format:\n\n` +
        "```md\n" +
        templateForUser +
        "\n```",
    );
  }
}

if (isFeature) {
  validateTemplate("feature", body);
} else if (isFix) {
  validateTemplate("bugfix", body);
} else {
  // Generic fallback
  const hasSummary = body.includes("Summary") || body.includes("Description");
  if (!hasSummary) {
    warn("Please include a Summary for this PR.");
  }
}

// 2. Enforce Documentation Updates
const hasDocumentation =
  danger.git.modified_files.includes("GEMINI.md") ||
  danger.git.modified_files.some((f) => f.startsWith("docs/"));
// Exclude PR templates and workflows from doc requirements
const isConfigChange = danger.git.modified_files.every((f) =>
  f.startsWith(".github/"),
);
const isCodeChange = danger.git.modified_files.some(
  (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
);
if (isCodeChange && !hasDocumentation && !isConfigChange) {
  warn(
    "Documentation was not updated. Did you forget to update `GEMINI.md` or `/docs`?",
  );
}

// 3. Large PR Warning
const bigPR = isPR
  ? danger.github.pr.additions + danger.github.pr.deletions > 500
  : false;
if (bigPR) {
  warn("Big PR! 📉 Consider breaking this into smaller PRs for better review.");
}
