import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassItem } from "@/app/types";

async function getClasses(): Promise<ClassItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    console.error("NEXT_PUBLIC_BASE_URL is not defined");
    return [];
  }

  const res = await fetch(
    `${baseUrl}/api/admin/classes`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("FAILED TO FETCH CLASSES");
    return [];
  }

  return res.json();
}

export default async function ClassesPage() {
  const classes = await getClasses();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Class Management</h1>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Class Name</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {classes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No classes found
                </TableCell>
              </TableRow>
            )}

            {classes.map((cls, index) => (
              <TableRow key={cls.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{cls.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
