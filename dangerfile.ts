import { danger, fail, warn } from "danger";

// 1. Verify PR Description Template
const body = danger.github.pr.body;
const hasSummary = body.includes("## Summary") || body.includes("### Summary");
const hasChanges = body.includes("## Changes") || body.includes("### Changes");

if (!hasSummary || !hasChanges) {
  fail(
    "Please follow the PR Template: Include 'Summary' and 'Changes' sections.",
  );
}

// 2. Enforce Evidence (Screenshots)
const hasScreenshots =
  danger.github.pr.body.includes(".png") ||
  danger.github.pr.body.includes(".jpg") ||
  danger.github.pr.body.includes(".jpeg");
if (!hasScreenshots) {
  warn(
    "⚠️ No screenshots detected. Remember the **16-Screen Rule** for UI changes!",
  );
}

// 3. Enforce Documentation Updates
const hasDocumentation =
  danger.git.modified_files.includes("GEMINI.md") ||
  danger.git.modified_files.some((f) => f.startsWith("docs/"));
const isCodeChange = danger.git.modified_files.some(
  (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
);
if (isCodeChange && !hasDocumentation) {
  warn(
    "Documentation was not updated. Did you forget to update `GEMINI.md` or `/docs`?",
  );
}

// 4. Large PR Warning
const bigPR = danger.github.pr.additions + danger.github.pr.deletions > 500;
if (bigPR) {
  warn("Big PR! 📉 Consider breaking this into smaller PRs for better review.");
}

// 5. Checklist Verified
const checklistChecked = danger.github.pr.body.includes("- [x]");
if (!checklistChecked) {
  warn("Please complete the PR Checklist.");
}

// 6. Enforce Release Report for Features
const isFeature = danger.github.pr.head.ref.startsWith("feat/");
const hasReleaseReport = danger.git.created_files.some((f) =>
  f.startsWith("release-reports/"),
);
if (isFeature && !hasReleaseReport) {
  warn("Features must include a Release Report in `release-reports/`.");
}
