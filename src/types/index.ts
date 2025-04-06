// 사용자 타입 정의
export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  work_time?: string;
}

// 근태 기록 타입 정의
export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  notes?: string;
  employee_name?: string;
  work_time?: string;
}

// 근태 기록 UI용 타입 정의
export interface AttendanceRecord {
  id?: string;
  employeeId?: string;  // 기존 UI 호환성
  employee_id?: string; // 백엔드 호환성
  startDateTime?: string; // 기존 UI 호환성
  endDateTime?: string;   // 기존 UI 호환성
  date?: string;          // 백엔드 호환성
  start_time?: string;    // 백엔드 호환성
  end_time?: string;      // 백엔드 호환성
  total_hours?: number;   // 백엔드 호환성
  totalHours?: number;    // 기존 UI 호환성
  notes?: string;
  employeeName?: string;  // 기존 UI 호환성
  employee_name?: string; // 백엔드 호환성
  work_time?: string;
}

// 월간 리포트 타입 정의
export interface MonthlyReport {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  totalDays: number;
  dates: { [date: string]: number };
  work_time?: string;
}

// 리포트 데이터 타입 정의
export interface ReportData {
  [employeeId: string]: {
    name: string;
    dates: { [date: string]: number };
    totalHours: number;
    work_time?: string;
  };
}

// 기본 근무 시간 타입 정의
export interface DefaultSchedule {
  id: string;
  employee_id: string;
  day_of_week: number; // 0: 일요일, 1: 월요일, ..., 6: 토요일
  start_time: string;
  end_time: string;
  created_at?: string;
  employees?: {
    id: string;
    name: string;
    work_time?: string;
  };
}

// 요일 표시용 상수
export const DAY_OF_WEEK_NAMES = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일'
];

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  work_time?: string;
} 