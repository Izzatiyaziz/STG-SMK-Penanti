export type User = {
    id: string;
    name: string;
    identifier: string;
    role: "admin" | "teacher" | "student";
    class?: {
        id: string;
        name: string;
    } | null;
};

export interface TeacherItem {
    id: string;
    name: string;
    email: string;
    identifier: string;
    phone?: string;
    roles: string[];
}

export type StudentPage = {
  id: string;
  name: string;
  identifier: string; // <-- IC number awak
  email?: string;
  className?: string;
  status: string;
  lastActive?: string;
  createdAt?: string;
  level?: string; 
  enrollment_date?: string;
};

export type StudentDashboardData = {
    className: string;
    classTeacher: string;
    average: number;
    position: number;
    totalStudents: number;
};

export type ClassItem = {
    id: string;
    name: string;
    grade: number;
    studentCount?: number;
};

export type SubjectItem = {
    id: string;
    name: string;
    coordinator?: {
        id: string;
        name: string;
    } | null;
};

export type ExamItem = {
    id: string;
    name: string;
    academic_year: string;
};

export type RoleItem = {
    role_id: string;
    role_name: string;
};

export type TeacherRoleItem = {
    idx: number;
    role_id: string;
    role_name: string;
};

export type Student = {
    id: string;
    name: string;
    identifier: string;
    classId?: string | null; // 🔑 penting
    className?: string; // display only
    status: string;
    email?: string;
};
