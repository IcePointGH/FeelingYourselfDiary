export type FeelingValue = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export type ThemeType = 'morandi' | 'minimal';

export interface User {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  signature?: string;
  theme: ThemeType;
  createdAt: string;
}

export interface ScheduleItem {
  id: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  feeling: FeelingValue;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: number;
  userId: number;
  emotionLabels: Record<string, string>;
  autoSaveThoughts: boolean;
  theme: ThemeType;
}

export interface DailyAnalysis {
  totalFeeling: number;
  itemCount: number;
  averageFeeling: number;
  items: ScheduleItem[];
}

export interface WeeklyAnalysis {
  totalFeeling: number;
  itemCount: number;
  averageFeeling: number;
  dailyTotals: Record<string, number>;
  items: ScheduleItem[];
}

export interface MonthlyAnalysis {
  totalFeeling: number;
  itemCount: number;
  averageFeeling: number;
  dailyTotals: Record<string, number>;
  items: ScheduleItem[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
}

export interface AnalysisData {
  totalFeeling: number;
  itemCount: number;
  averageFeeling: number;
  dailyTotals?: Record<string, number>;
  items?: ScheduleItem[];
}
