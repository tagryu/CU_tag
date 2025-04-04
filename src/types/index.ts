// 사용자 타입 정의
export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
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
}

// 월별 집계 데이터 타입 정의
export interface MonthlyReport {
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM 형식
  totalDays: number;
  totalHours: number;
  records: Attendance[];
}

// 출석 기록 타입 정의
export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  startDateTime: string;
  endDateTime: string;
  notes?: string;
}

// 월간 보고서 데이터 타입 정의
export interface ReportData {
  employeeId: string;
  employeeName: string;
  workDays: number;
  totalHours: number;
  absenceDays: number;
  efficiency?: number;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
} 