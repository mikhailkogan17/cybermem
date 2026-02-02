"use client";

import ChartCard from "./charts/chart-card";

export default function ChartsSection({ period }: { period: string }) {
  // Remove the period prop since each chart will have its own selector
  // Just render the charts, they'll manage their own data
  return (
    <div className="grid grid-cols-2 gap-6">
      <ChartCard service="Creates by Client" />
      <ChartCard service="Reads by Client" />
      <ChartCard service="Updates by Client" />
      <ChartCard service="Deletes by Client" />
    </div>
  );
}
