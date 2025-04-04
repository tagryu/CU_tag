import { supabase } from './supabase';
import { Attendance, MonthlyReport, User, AttendanceRecord, ReportData } from '../types';
import * as XLSX from 'xlsx';

// 근태 기록 관련 서비스
export const attendanceService = {
  // 직원 목록 가져오기
  getEmployees: async (): Promise<User[]> => {
    try {
      console.log('직원 목록 조회 시작');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*');
      
      if (error) {
        console.error('직원 목록 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 직원 목록:', data);
      return data as User[];
    } catch (err) {
      console.error('getEmployees 오류:', err);
      throw err;
    }
  },
  
  // 특정 직원의 근태 기록 가져오기
  getAttendanceByEmployee: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    try {
      console.log('조회 기간:', startDate, endDate);
      console.log('employeeId:', employeeId);
      
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        console.error('조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 데이터:', data);
      
      // 데이터베이스 컬럼 이름과 타입 필드 이름 맞추기
      return (data || []).map(record => ({
        id: record.id,
        employeeId: record.employee_id,
        startDateTime: `${record.date}T${record.start_time}`,
        endDateTime: `${record.date}T${record.end_time}`,
        notes: record.notes || ''
      }));
    } catch (err) {
      console.error('getAttendanceByEmployee 오류:', err);
      throw err;
    }
  },
  
  // 날짜별 근태 기록 가져오기
  getAttendanceByDate: async (date: string): Promise<Attendance[]> => {
    const { data, error } = await supabase
      .from('attendances')
      .select('*, employees(name)')
      .eq('date', date);
    
    if (error) throw error;
    return data as Attendance[];
  },
  
  // 월별 근태 기록 가져오기 (YYYY-MM 형식)
  getAttendanceByMonth: async (month: string): Promise<Attendance[]> => {
    // YYYY-MM 형식을 이용하여 해당 월의 시작일과 종료일 계산
    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10); // 해당 월의 마지막 날
    
    console.log(`getAttendanceByMonth: 조회 기간 ${startDate} ~ ${endDate}`);
    
    try {
      // 두 테이블에서 모두 데이터를 가져와 통합
      let allRecords: any[] = [];
      
      // 1. attendances 테이블 조회
      try {
        const { data: attendancesData, error: attendancesError } = await supabase
          .from('attendances')
          .select('*, employees(id, name)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        
        if (attendancesError) {
          console.error('attendances 테이블 조회 오류:', attendancesError);
        } else if (attendancesData) {
          console.log('attendances 테이블에서 가져온 데이터:', attendancesData);
          
          // 직원 이름 추가 처리
          const processedRecords = attendancesData.map(record => {
            const employeeName = record.employees ? record.employees.name : null;
            return {
              ...record,
              employee_name: employeeName
            };
          });
          
          allRecords = [...processedRecords];
        }
      } catch (err) {
        console.error('attendances 테이블 조회 중 오류:', err);
      }
      
      // 2. attendance_records 테이블도 조회
      try {
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*, employees(id, name)')
          .gte('start_date_time', `${startDate}T00:00:00`)
          .lte('start_date_time', `${endDate}T23:59:59`)
          .order('start_date_time', { ascending: true });
          
        if (recordsError) {
          console.error('attendance_records 테이블 조회 오류:', recordsError);
        } else if (recordsData && recordsData.length > 0) {
          console.log('attendance_records 테이블에서 가져온 데이터:', recordsData);
          
          // 형식을 attendances 형식과 맞추기
          const convertedRecords = recordsData.map(record => {
            const dateOnly = record.start_date_time.split('T')[0];
            const startTime = record.start_date_time.split('T')[1]?.substring(0, 8) || '00:00:00';
            const endTime = record.end_date_time.split('T')[1]?.substring(0, 8) || '00:00:00';
            
            const employeeName = record.employees ? record.employees.name : null;
            
            return {
              id: record.id,
              employee_id: record.employee_id,
              date: dateOnly,
              start_time: startTime,
              end_time: endTime,
              employee_name: employeeName,
              employees: record.employees
            };
          });
          
          allRecords = [...allRecords, ...convertedRecords];
        }
      } catch (err) {
        console.error('attendance_records 테이블 조회 중 오류:', err);
      }
      
      console.log('두 테이블에서 조회한 통합 데이터:', allRecords);
      return allRecords as Attendance[];
    } catch (error) {
      console.error('getAttendanceByMonth 오류:', error);
      throw error;
    }
  },
  
  // 근태 기록 추가
  addAttendance: async ({
    employeeId,
    startDateTime,
    endDateTime,
    notes
  }: {
    employeeId: string;
    startDateTime: string;
    endDateTime: string;
    notes?: string;
  }): Promise<AttendanceRecord> => {
    try {
      console.log('근무 기록 추가 중:', { employeeId, startDateTime, endDateTime, notes });
      
      // 날짜 및 시간 데이터 처리
      const startDate = startDateTime.split('T')[0];
      const startTime = startDateTime.split('T')[1].substring(0, 5);
      
      const endDate = endDateTime.split('T')[0];
      const endTime = endDateTime.split('T')[1].substring(0, 5);
      
      // 데이터 유효성 검사
      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error('날짜와 시간 형식이 올바르지 않습니다.');
      }
      
      // 시작 시간과 종료 시간으로 근무 시간 계산
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinute = parseInt(endTime.split(':')[1]);
      
      let totalHours = endHour - startHour;
      
      // 분 차이 계산 및 시간에 추가
      let minuteDiff = endMinute - startMinute;
      totalHours += minuteDiff / 60;
      
      // 총 근무 시간이 음수인 경우(종료 시간이 시작 시간보다 이전) 처리
      if (totalHours < 0) {
        totalHours += 24; // 오버나이트 근무 가정
      }
      
      console.log('계산된 총 근무 시간:', totalHours);
      
      // 데이터베이스 레코드 구성
      const dbRecord: any = {
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: parseFloat(totalHours.toFixed(2))
      };
      
      // 직원 ID 추가
      if (employeeId) {
        dbRecord.employee_id = employeeId;
      }
      
      // 메모 추가
      if (notes) {
        dbRecord.notes = notes;
      }
      
      console.log('데이터베이스 레코드 구성:', dbRecord);
      
      // Supabase에 데이터 삽입
      const { data, error } = await supabase
        .from('attendances')
        .insert(dbRecord)
        .select();
      
      if (error) {
        console.error('Supabase 오류:', error);
        throw new Error(`근무 기록 추가 중 오류가 발생했습니다: ${error.message}`);
      }
      
      console.log('근무 기록 추가 완료:', data);
      return data[0];
    } catch (error: any) {
      console.error('근무 기록 추가 중 오류:', error);
      throw new Error(error?.message || '근무 기록 추가 중 오류가 발생했습니다.');
    }
  },
  
  // 근태 기록 수정
  updateAttendance: async (
    id: string,
    {
      employeeId,
      startDateTime,
      endDateTime,
      notes
    }: {
      employeeId: string;
      startDateTime: string;
      endDateTime: string;
      notes?: string;
    }
  ): Promise<AttendanceRecord> => {
    try {
      console.log('근무 기록 업데이트 중:', { id, employeeId, startDateTime, endDateTime, notes });
      
      // 날짜 및 시간 데이터 처리
      const startDate = startDateTime.split('T')[0];
      const startTime = startDateTime.split('T')[1].substring(0, 5);
      
      const endDate = endDateTime.split('T')[0];
      const endTime = endDateTime.split('T')[1].substring(0, 5);
      
      // 데이터 유효성 검사
      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error('날짜와 시간 형식이 올바르지 않습니다.');
      }
      
      // 시작 시간과 종료 시간으로 근무 시간 계산
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinute = parseInt(endTime.split(':')[1]);
      
      let totalHours = endHour - startHour;
      
      // 분 차이 계산 및 시간에 추가
      let minuteDiff = endMinute - startMinute;
      totalHours += minuteDiff / 60;
      
      // 총 근무 시간이 음수인 경우(종료 시간이 시작 시간보다 이전) 처리
      if (totalHours < 0) {
        totalHours += 24; // 오버나이트 근무 가정
      }
      
      console.log('계산된 총 근무 시간:', totalHours);
      
      // 데이터베이스 레코드 업데이트
      const updateRecord: any = {
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: parseFloat(totalHours.toFixed(2))
      };
      
      // 직원 ID 추가 (변경된 경우)
      if (employeeId) {
        updateRecord.employee_id = employeeId;
      }
      
      // 메모 업데이트
      updateRecord.notes = notes || '';
      
      console.log('업데이트할 레코드:', updateRecord);
      
      // Supabase에서 데이터 업데이트
      const { data, error } = await supabase
        .from('attendances')
        .update(updateRecord)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Supabase 오류:', error);
        throw new Error(`근무 기록 업데이트 중 오류가 발생했습니다: ${error.message}`);
      }
      
      console.log('근무 기록 업데이트 완료:', data);
      return data[0];
    } catch (error: any) {
      console.error('근무 기록 업데이트 중 오류:', error);
      throw new Error(error?.message || '근무 기록 업데이트 중 오류가 발생했습니다.');
    }
  },
  
  // 근태 기록 삭제
  deleteAttendance: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // 월별 보고서 생성 및 다운로드
  generateMonthlyReport: async (month: string): Promise<ReportData[]> => {
    try {
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]);
      const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // 해당 월의 마지막 날
      
      console.log('월간 보고서 기간:', startDate, endDate);
      
      const { data: records, error } = await supabase
        .from('attendances')
        .select(`
          id,
          employee_id,
          date,
          start_time,
          end_time,
          total_hours,
          employees (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('월간 보고서 데이터 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 월간 보고서 데이터:', records);

      // 직원별 근무 시간 계산
      const report = records.reduce((acc: any, record: any) => {
        const employeeId = record.employee_id;
        const employeeName = record.employees?.name || '알 수 없음';
        
        if (!acc[employeeId]) {
          acc[employeeId] = {
            employeeId,
            employeeName,
            workDays: new Set(),
            totalHours: 0,
            absenceDays: 0
          };
        }

        acc[employeeId].workDays.add(record.date);
        acc[employeeId].totalHours += Number(record.total_hours) || 0;

        return acc;
      }, {});
      
      // 월의 근무일수 계산 (주말 제외)
      const workDaysInMonth = Array.from(
        { length: new Date(year, monthNum, 0).getDate() },
        (_, i) => new Date(year, monthNum - 1, i + 1)
      ).filter(date => date.getDay() !== 0 && date.getDay() !== 6).length;
      
      // 결과 배열로 변환
      const result = Object.values(report).map((r: any) => {
        const workDays = r.workDays.size;
        const absenceDays = Math.max(0, workDaysInMonth - workDays);
        const efficiency = ((r.totalHours / (workDays * 8)) * 100).toFixed(1);
        
        return {
          ...r,
          workDays,
          absenceDays,
          efficiency
        };
      });
      
      console.log('생성된 보고서:', result);
      return result as ReportData[];
    } catch (err) {
      console.error('generateMonthlyReport 오류:', err);
      throw err;
    }
  },
  
  // 출석 기록 생성
  createAttendance: async (data: { 
    employee_id: string; 
    date: string; 
    start_time?: string; 
    end_time?: string; 
    notes?: string;
  }): Promise<AttendanceRecord> => {
    try {
      // 기본값 설정
      const recordData = {
        employee_id: data.employee_id,
        date: data.date,
        start_time: data.start_time || '09:00:00',
        end_time: data.end_time || '18:00:00',
        total_hours: 0
      };
      
      // 시작 시간과 종료 시간이 있는 경우 총 시간 계산
      if (data.start_time && data.end_time) {
        const startTime = new Date(`${data.date}T${data.start_time}`);
        const endTime = new Date(`${data.date}T${data.end_time}`);
        recordData.total_hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      } else {
        // 기본 8시간
        recordData.total_hours = 8;
      }
      
      console.log('생성할 출석 기록:', recordData);
      
      const { data: record, error } = await supabase
        .from('attendances')
        .insert(recordData)
        .select()
        .single();
      
      if (error) {
        console.error('출석 기록 생성 오류:', error);
        throw error;
      }
      
      console.log('생성된 출석 기록:', record);
      
      // AttendanceRecord 형식으로 변환하여 반환
      return {
        id: record.id,
        employeeId: record.employee_id,
        startDateTime: `${record.date}T${record.start_time}`,
        endDateTime: `${record.date}T${record.end_time}`,
        notes: data.notes || ''
      };
    } catch (err) {
      console.error('createAttendance 오류:', err);
      throw err;
    }
  },
  
  // ID와 비밀번호로 로그인
  loginWithId: async (userId: string, password: string) => {
    try {
      console.log('로그인 시도:', userId, password);
      
      // 직원 테이블에서 ID로 사용자 조회
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('직원 조회 오류:', error);
        throw new Error('등록되지 않은 ID입니다.');
      }
      
      // 비밀번호 확인
      if (data.password !== password) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
      
      console.log('로그인 성공:', data);
      
      // 비밀번호 제외하고 반환
      const { password: _, ...userInfo } = data;
      return userInfo;
    } catch (err) {
      console.error('로그인 오류:', err);
      throw err;
    }
  }
}; 