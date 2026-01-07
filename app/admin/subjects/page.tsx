import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubjectItem } from "@/app/types";

async function getSubjects(): Promise<SubjectItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    console.error("NEXT_PUBLIC_BASE_URL is not defined");
    return [];
  }

  const res = await fetch(
    `${baseUrl}/api/admin/subjects`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("FAILED TO FETCH SUBJECTS");
    return [];
  }

  return res.json();
}

export default async function SubjectsPage() {
  const subjects = await getSubjects();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Subject Management</h1>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Subject Name</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {subjects.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No subjects found
                </TableCell>
              </TableRow>
            )}

            {subjects.map((subject, index) => (
              <TableRow key={subject.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{subject.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
