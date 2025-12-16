export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'FACULTY';

export type PaperStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'SUBJECTIVE';
  options?: string[]; // For MCQ
  correctAnswer?: string; // For Answer Key
  marks: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface PaperTemplate {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface QuestionPaper {
  id: string;
  title: string;
  subject: string;
  facultyId: string;
  facultyName: string;
  status: PaperStatus;
  createdAt: string;
  questions: Question[];
  feedback?: string;
  templateUrl?: string; // URL to uploaded college header/format
  
  // New Fields
  universityName?: string;
  examDate?: string;
  maxMarks?: number;
  enrollmentCode?: string;
  instructions?: string; // For "Important Note"
  formatFile?: string; // Name of the uploaded format file
  templateId?: string; // ID of the selected template
}

export interface StatMetric {
  name: string;
  value: number;
  color?: string;
}

export interface DifficultyStat {
  level: string;
  count: number;
}