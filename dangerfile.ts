import { danger, fail, warn } from "danger";

// 1. Verify PR Description and Template Usage
const isPR = danger.github && danger.github.pr;
const body = isPR ? danger.github.pr.body : "";
const headRef = isPR ? danger.github.pr.head.ref : danger.git.head || "";
const isFeature = headRef.startsWith("feat/");
const isFix = headRef.startsWith("fix/");

const fs = require("fs");

/**
 * Validates that the PR body contains all required headers from the template.
 */
function validateTemplate(type: "feature" | "bugfix", body: string) {
  const templatePath = `.github/PULL_REQUEST_TEMPLATE/${type}.md`;
  if (!fs.existsSync(templatePath)) return;

  const templateContent = fs.readFileSync(templatePath, "utf8");
  // Extract headers (lines starting with #)
  const requiredHeaders = templateContent
    .split("\n")
    .filter((line: string) => line.startsWith("#"))
    .map((line: string) => line.trim());

  const missingHeaders = requiredHeaders.filter(
    (header: string) => !body.includes(header),
  );

  if (missingHeaders.length > 0) {
    const templateForUser = templateContent
      .replace(/^---[\s\S]*?---/, "")
      .trim();
    fail(
      `🚫 **Missing required headers from ${type} template**: ${missingHeaders.join(", ")}\n\n` +
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
