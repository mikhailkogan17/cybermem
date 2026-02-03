import { danger, fail, warn } from "danger";

// 1. Verify PR Description and Template Usage
const isPR = danger.github && danger.github.pr;
const body = isPR ? danger.github.pr.body : "";
const headRef = isPR ? danger.github.pr.head.ref : danger.git.head || "";
const isFeature = headRef.startsWith("feat/");
const isFix = headRef.startsWith("fix/");

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
const bigPR = isPR
  ? danger.github.pr.additions + danger.github.pr.deletions > 500
  : false;
if (bigPR) {
  warn("Big PR! 📉 Consider breaking this into smaller PRs for better review.");
}

// 5. Checklist Verified (Disabled: caused false positives)
// const checklistChecked = body.includes("- [x]");
// if (!checklistChecked) {
//   warn("Please complete the PR Checklist.");
// }

// 6. Enforce Release Report for Features
const isFeatureBranch = headRef.startsWith("feat/");
const hasReleaseReport = danger.git.created_files.some((f) =>
  f.startsWith("release-reports/"),
);
if (isFeatureBranch && !hasReleaseReport) {
  warn("Features must include a Release Report in `release-reports/`.");
}

// 7. Enforce Release Report Template Structure (Strict)
const fs = require("fs");
const path = require("path");

const releaseReports = danger.git.created_files
  .concat(danger.git.modified_files)
  .filter(
    (f) => f.startsWith("release-reports/release-report-") && f.endsWith(".md"),
  );

if (releaseReports.length > 0) {
  const templatePath = "release-reports/TEMPLATE.md";
  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const templateLines = templateContent.split("\n");

    releaseReports.forEach((reportPath) => {
      if (!fs.existsSync(reportPath)) return;
      const reportContent = fs.readFileSync(reportPath, "utf8");
      const reportLines = reportContent.split("\n");

      // Naive line-by-line check with [wildcards]
      // We expect the report to have AT LEAST the same number of lines or similar structure
      // But user fills in [...] so lines might expand if they add multi-line text where [...] was.
      // However, the rule is "DO NOT MODIFY STRUCTURE", implying headers and fixed text must match.

      // Strategy: Extract all headers and fixed labels from template and ensure they exist in order.
      const fixedMarkers = templateLines
        .map((line) => line.trim())
        .filter(
          (line) =>
            line.length > 0 &&
            !line.startsWith(">") &&
            !line.match(/^[-*]\s*\[.*\]/),
        ); // Ignore quotes and checklists for stricter structural headers/labels

      // Better Strategy: Regex matching for each template line
      let reportLineIndex = 0;
      let unauthorizedChange = false;

      for (const tLine of templateLines) {
        const cleanTLine = tLine.trim();
        if (cleanTLine === "") continue;

        // Convert template line to regex
        // Escape standard regex chars
        let regexStr = cleanTLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Replace [...] placeholders with wildcard .*
        // Since we escaped [, it is now \[. So we look for \[...\]
        // We use a global replace for the escaped pattern
        regexStr = regexStr.replace(/\\\[\.\.\.\\\]/g, ".*");

        // Also allow checkbox state changes: [ ] -> [x] or [ ] or [SKIPPED]
        // Template: - [ ] **Data Proof**
        // Escaped: - \[ \] \*\*Data Proof\*\*
        // Regex: - \[(x| |SKIPPED)\] \*\*Data Proof\*\*
        regexStr = regexStr.replace(/\\\[\s*\\\]/g, "\\[(x| |SKIPPED)\\]");

        // Handling [Version] and [YYYY-MM-DD] etc.
        // These are also \[...\] patterns in the escaped string.
        // This must come AFTER the more specific checkbox and '...' replacements.
        regexStr = regexStr.replace(/\\\[.*?\\\]/g, ".*"); // Catch-all for any bracketed placeholder [Version], [Date], [Status]

        const regex = new RegExp(`^${regexStr}$`);

        // Find this line in report (sequential search)
        let found = false;
        // Search forward from current position
        for (let i = reportLineIndex; i < reportLines.length; i++) {
          const rLine = reportLines[i].trim();
          if (regex.test(rLine)) {
            found = true;
            reportLineIndex = i + 1; // Advance
            break;
          }
        }

        if (!found) {
          fail(
            `Release Report Structure Violation in ${reportPath}: Expected structure matching '${cleanTLine}' not found in order.`,
          );
          unauthorizedChange = true;
          break;
        }
      }

      if (!unauthorizedChange) {
        // Check for forbidden extra sections?
        // For now, if all template lines are found in order, we assume compliance.
      }
    });
  }
}
