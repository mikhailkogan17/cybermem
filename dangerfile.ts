import { danger, fail, warn } from "danger";

// 1. Verify PR Description and Template Usage
const isPR = danger.github && danger.github.pr;
const body = isPR ? danger.github.pr.body : "";
const title = isPR ? danger.github.pr.title.toLowerCase() : "";
// Check for "feat" or "fix" anywhere in title (matches feat:, feat(, feature, fix:, fix(, bugfix, etc.)
const isFeature = title.includes("feat");
const isFix = title.includes("fix");

const fs = require("fs");

/**
 * Validates that the PR body contains all required headers from the template.
 */
function validateTemplate(type, body) {
  const templatePath = `.github/PULL_REQUEST_TEMPLATE/${type}.md`;

  try {
    if (!fs.existsSync(templatePath)) {
      warn(
        `Expected PR template not found at "${templatePath}". ` +
          "Please verify that the PR template exists and is correctly configured.",
      );
      return;
    }

    const templateContent = fs.readFileSync(templatePath, "utf8");
    // Remove frontmatter before extracting headers
    const contentWithoutFrontmatter = templateContent.replace(
      /^---[\s\S]*?---\n/,
      "",
    );
    // Extract headers (lines starting with #)
    const requiredHeaders = contentWithoutFrontmatter
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
  } catch (error) {
    warn(
      `Failed to validate PR template: ${error.message}. ` +
        "This may indicate a filesystem issue or misconfigured template path.",
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

// 4. Branch Naming Convention
if (isPR) {
  const branchName = danger.github.pr.head.ref;
  const branchPattern = /^(feat|fix|chore|docs|test)\/CM-\d+-[a-z0-9-]+$/;

  if (!branchPattern.test(branchName)) {
    fail(
      `❌ Invalid branch name: \`${branchName}\`\n\n` +
        `Expected format: \`<type>/CM-<number>-<description>\`\n` +
        `Types: feat, fix, chore, docs, test\n\n` +
        `Example: \`feat/CM-48-rag-summary-endpoint\``,
    );
  }

  // Extract and link to Linear issue
  const issueMatch = branchName.match(/CM-(\d+)/);
  if (issueMatch) {
    const issueId = `CM-${issueMatch[1]}`;
    const issueUrl = `https://linear.app/cybermem/issue/${issueId}`;

    // Check if PR body already contains the Linear link
    if (!body.includes(issueUrl)) {
      warn(
        `📋 **Linear Issue:** [${issueId}](${issueUrl})\n\n` +
          `Consider adding this link to your PR description for better traceability.`,
      );
    }
  }
}
