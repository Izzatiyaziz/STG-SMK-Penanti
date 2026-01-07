import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { DataTable } from "@/components/data-table";
import data from "./data.json";

export default function AdminDashboardPage() {
  return (
    <>
      <SectionCards />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>

      <DataTable data={data} />
    </>
  );
}
