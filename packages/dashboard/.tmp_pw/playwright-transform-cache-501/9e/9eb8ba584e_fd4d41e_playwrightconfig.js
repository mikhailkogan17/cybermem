"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _test = require("@playwright/test");
var _default = exports.default = (0, _test.defineConfig)({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",
    screenshot: "only-on-failure"
  },
  projects: [{
    name: "api",
    testMatch: "api.spec.ts"
  }, {
    name: "ui",
    testMatch: "ui.spec.ts",
    use: {
      ..._test.devices["Desktop Chrome"]
    }
  }]
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfdGVzdCIsInJlcXVpcmUiLCJfZGVmYXVsdCIsImV4cG9ydHMiLCJkZWZhdWx0IiwiZGVmaW5lQ29uZmlnIiwidGVzdERpciIsIm91dHB1dERpciIsInJlcG9ydGVyIiwidXNlIiwiYmFzZVVSTCIsInByb2Nlc3MiLCJlbnYiLCJEQVNIQk9BUkRfVVJMIiwic2NyZWVuc2hvdCIsInByb2plY3RzIiwibmFtZSIsInRlc3RNYXRjaCIsImRldmljZXMiXSwic291cmNlcyI6WyJwbGF5d3JpZ2h0LmNvbmZpZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZWZpbmVDb25maWcsIGRldmljZXMgfSBmcm9tIFwiQHBsYXl3cmlnaHQvdGVzdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICB0ZXN0RGlyOiBcIi4vZTJlXCIsXG4gIG91dHB1dERpcjogXCIuL3Rlc3QtcmVzdWx0c1wiLFxuICByZXBvcnRlcjogXCJodG1sXCIsXG4gIHVzZToge1xuICAgIGJhc2VVUkw6IHByb2Nlc3MuZW52LkRBU0hCT0FSRF9VUkwgfHwgXCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIixcbiAgICBzY3JlZW5zaG90OiBcIm9ubHktb24tZmFpbHVyZVwiLFxuICB9LFxuICBwcm9qZWN0czogW1xuICAgIHtcbiAgICAgIG5hbWU6IFwiYXBpXCIsXG4gICAgICB0ZXN0TWF0Y2g6IFwiYXBpLnNwZWMudHNcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwidWlcIixcbiAgICAgIHRlc3RNYXRjaDogXCJ1aS5zcGVjLnRzXCIsXG4gICAgICB1c2U6IHsgLi4uZGV2aWNlc1tcIkRlc2t0b3AgQ2hyb21lXCJdIH0sXG4gICAgfSxcbiAgXSxcbn0pO1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFBQSxLQUFBLEdBQUFDLE9BQUE7QUFBeUQsSUFBQUMsUUFBQSxHQUFBQyxPQUFBLENBQUFDLE9BQUEsR0FFMUMsSUFBQUMsa0JBQVksRUFBQztFQUMxQkMsT0FBTyxFQUFFLE9BQU87RUFDaEJDLFNBQVMsRUFBRSxnQkFBZ0I7RUFDM0JDLFFBQVEsRUFBRSxNQUFNO0VBQ2hCQyxHQUFHLEVBQUU7SUFDSEMsT0FBTyxFQUFFQyxPQUFPLENBQUNDLEdBQUcsQ0FBQ0MsYUFBYSxJQUFJLHVCQUF1QjtJQUM3REMsVUFBVSxFQUFFO0VBQ2QsQ0FBQztFQUNEQyxRQUFRLEVBQUUsQ0FDUjtJQUNFQyxJQUFJLEVBQUUsS0FBSztJQUNYQyxTQUFTLEVBQUU7RUFDYixDQUFDLEVBQ0Q7SUFDRUQsSUFBSSxFQUFFLElBQUk7SUFDVkMsU0FBUyxFQUFFLFlBQVk7SUFDdkJSLEdBQUcsRUFBRTtNQUFFLEdBQUdTLGFBQU8sQ0FBQyxnQkFBZ0I7SUFBRTtFQUN0QyxDQUFDO0FBRUwsQ0FBQyxDQUFDIiwiaWdub3JlTGlzdCI6W119