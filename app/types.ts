export type User = {
  id: string;
  name: string;
  identifier: string;
  role: "admin" | "teacher" | "student";
};

export type ClassItem = {
  id: string;
  name: string;
};

export type SubjectItem = {
  id: string;
  name: string;
};

