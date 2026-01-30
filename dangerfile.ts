import { danger, fail, warn } from "danger";

// 1. Verify PR Description and Template Usage
const body = danger.github.pr.body;
const isFeature = danger.github.pr.head.ref.startsWith("feat/");
const isFix = danger.github.pr.head.ref.startsWith("fix/");

if (isFeature) {
  const hasDecomposition = body.includes("## Feature Decomposition");
  const hasEdgeCases = body.includes("### Edge Cases");
  const hasVerification = body.includes("## Verification");

  if (!hasDecomposition || !hasEdgeCases) {
    fail(
      "Features MUST use the Feature Template and include Decomposition (Requirements, Edge Cases).",
    );
  }
} else if (isFix) {
  const hasPostmortem = body.includes("## Postmortem Analysis");
  const hasRootCause = body.includes("### Root Cause");

  if (!hasPostmortem || !hasRootCause) {
    fail(
      "Bugfixes MUST use the Bugfix Template and include a Postmortem (Root Cause).",
    );
  }
} else {
  // Generic fallback
  const hasSummary = body.includes("Summary") || body.includes("Description");
  if (!hasSummary) {
    warn("Please include a Summary for this PR.");
  }
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
const isFeatureBranch = danger.github.pr.head.ref.startsWith("feat/");
const hasReleaseReport = danger.git.created_files.some((f: string) =>
  f.startsWith("release-reports/"),
);
if (isFeatureBranch && !hasReleaseReport) {
  warn("Features must include a Release Report in `release-reports/`.");
}
