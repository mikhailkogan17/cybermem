"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _test = require("@playwright/test");
var _default = exports.default = (0, _test.defineConfig)({
  testDir: "./e2e/integration",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    // Base URL depends on target (staging/prod), handled in specifc test or env
    screenshot: "only-on-failure",
    trace: "on-first-retry"
  },
  projects: [{
    name: "integration",
    testMatch: "integration.spec.ts",
    use: {
      ..._test.devices["Desktop Chrome"]
    }
  }]
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfdGVzdCIsInJlcXVpcmUiLCJfZGVmYXVsdCIsImV4cG9ydHMiLCJkZWZhdWx0IiwiZGVmaW5lQ29uZmlnIiwidGVzdERpciIsIm91dHB1dERpciIsInJlcG9ydGVyIiwidXNlIiwic2NyZWVuc2hvdCIsInRyYWNlIiwicHJvamVjdHMiLCJuYW1lIiwidGVzdE1hdGNoIiwiZGV2aWNlcyJdLCJzb3VyY2VzIjpbInBsYXl3cmlnaHQuY29uZmlnLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlZmluZUNvbmZpZywgZGV2aWNlcyB9IGZyb20gXCJAcGxheXdyaWdodC90ZXN0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHRlc3REaXI6IFwiLi9lMmUvaW50ZWdyYXRpb25cIixcbiAgb3V0cHV0RGlyOiBcIi4vdGVzdC1yZXN1bHRzXCIsXG4gIHJlcG9ydGVyOiBcImh0bWxcIixcbiAgdXNlOiB7XG4gICAgLy8gQmFzZSBVUkwgZGVwZW5kcyBvbiB0YXJnZXQgKHN0YWdpbmcvcHJvZCksIGhhbmRsZWQgaW4gc3BlY2lmYyB0ZXN0IG9yIGVudlxuICAgIHNjcmVlbnNob3Q6IFwib25seS1vbi1mYWlsdXJlXCIsXG4gICAgdHJhY2U6IFwib24tZmlyc3QtcmV0cnlcIixcbiAgfSxcbiAgcHJvamVjdHM6IFtcbiAgICB7XG4gICAgICBuYW1lOiBcImludGVncmF0aW9uXCIsXG4gICAgICB0ZXN0TWF0Y2g6IFwiaW50ZWdyYXRpb24uc3BlYy50c1wiLFxuICAgICAgdXNlOiB7IC4uLmRldmljZXNbXCJEZXNrdG9wIENocm9tZVwiXSB9LFxuICAgIH0sXG4gIF0sXG59KTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBQUEsS0FBQSxHQUFBQyxPQUFBO0FBQXlELElBQUFDLFFBQUEsR0FBQUMsT0FBQSxDQUFBQyxPQUFBLEdBRTFDLElBQUFDLGtCQUFZLEVBQUM7RUFDMUJDLE9BQU8sRUFBRSxtQkFBbUI7RUFDNUJDLFNBQVMsRUFBRSxnQkFBZ0I7RUFDM0JDLFFBQVEsRUFBRSxNQUFNO0VBQ2hCQyxHQUFHLEVBQUU7SUFDSDtJQUNBQyxVQUFVLEVBQUUsaUJBQWlCO0lBQzdCQyxLQUFLLEVBQUU7RUFDVCxDQUFDO0VBQ0RDLFFBQVEsRUFBRSxDQUNSO0lBQ0VDLElBQUksRUFBRSxhQUFhO0lBQ25CQyxTQUFTLEVBQUUscUJBQXFCO0lBQ2hDTCxHQUFHLEVBQUU7TUFBRSxHQUFHTSxhQUFPLENBQUMsZ0JBQWdCO0lBQUU7RUFDdEMsQ0FBQztBQUVMLENBQUMsQ0FBQyIsImlnbm9yZUxpc3QiOltdfQ==