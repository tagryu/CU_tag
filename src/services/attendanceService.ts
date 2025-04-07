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
  deleteAttendance: async (id: string): Promise<boolean> => {
    try {
      console.log('근무 기록 삭제 중...', id);
      
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('근무 기록 삭제 오류:', error);
        throw error;
      }
      
      console.log('근무 기록 삭제 성공');
      return true;
    } catch (err) {
      console.error('deleteAttendance 오류:', err);
      throw err;
    }
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
  },
  
  // 모든 근무 기록 가져오기 (어드민용)
  getAllAttendances: async (page: number = 1, limit: number = 20): Promise<{
    data: AttendanceRecord[],
    count: number
  }> => {
    try {
      console.log('모든 근무 기록 조회 중...');
      
      // 전체 카운트 먼저 가져오기
      const { data: countData, error: countError } = await supabase
        .from('attendances')
        .select('id', { count: 'exact', head: true });
      
      if (countError) {
        console.error('근무 기록 카운트 오류:', countError);
        throw countError;
      }
      
      const totalCount = countData ? countData.length : 0;
      
      // 페이지네이션 적용하여 데이터 가져오기
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error } = await supabase
        .from('attendances')
        .select('*, employees(id, name)')
        .range(from, to)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('근무 기록 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 모든 근무 기록:', data);
      
      // 데이터 변환
      const records = data.map(record => ({
        id: record.id,
        employeeId: record.employee_id,
        employeeName: record.employees?.name || '알 수 없음',
        startDateTime: `${record.date}T${record.start_time}`,
        endDateTime: `${record.date}T${record.end_time}`,
        totalHours: record.total_hours,
        notes: record.notes || ''
      }));
      
      return {
        data: records,
        count: totalCount
      };
    } catch (err) {
      console.error('getAllAttendances 오류:', err);
      throw err;
    }
  },
  
  // 기간 내 모든 직원의 근무 기록 가져오기 (어드민용)
  getAllAttendancesByPeriod: async (
    startDate: string,
    endDate: string
  ): Promise<any[]> => {
    try {
      console.log(`${startDate}부터 ${endDate}까지의 모든 근무 기록 조회 중...`);
      
      const { data, error } = await supabase
        .from('attendances')
        .select('*, employees(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('근무 기록 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 모든 근무 기록:', data);
      
      // 데이터 변환
      const records = data.map(record => ({
        id: record.id,
        employee_id: record.employee_id,
        employee_name: record.employees?.name || '알 수 없음',
        date: record.date,
        start_time: record.start_time,
        end_time: record.end_time,
        total_hours: record.total_hours,
        notes: record.notes || '',
        status: record.status || 'pending'
      }));
      
      return records;
    } catch (err) {
      console.error('getAllAttendancesByPeriod 오류:', err);
      throw err;
    }
  },
  
  // 사용자별 근무 시간 통계 (어드민용)
  getUserWorkStats: async (
    startDate: string,
    endDate: string
  ): Promise<any[]> => {
    try {
      console.log(`${startDate}부터 ${endDate}까지의 사용자별 근무 통계 조회 중...`);
      
      // 모든 직원 조회
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('role', 'employee');
      
      if (employeeError) {
        console.error('직원 조회 오류:', employeeError);
        throw employeeError;
      }
      
      // 모든 근무 기록 조회
      const { data: attendances, error: attendanceError } = await supabase
        .from('attendances')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (attendanceError) {
        console.error('근무 기록 조회 오류:', attendanceError);
        throw attendanceError;
      }
      
      // 직원별 통계 계산
      const stats = employees.map(employee => {
        const employeeAttendances = attendances.filter(a => a.employee_id === employee.id);
        
        // 총 근무 시간 및 일수 계산
        const totalHours = employeeAttendances.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0);
        const workDays = new Set(employeeAttendances.map(a => a.date)).size;
        
        return {
          employee_id: employee.id,
          employee_name: employee.name,
          total_hours: totalHours.toFixed(1),
          work_days: workDays
        };
      });
      
      console.log('계산된 사용자별 근무 통계:', stats);
      
      // 통계에 근무타임 정보 추가
      const enrichedStats = stats.map((stat: any) => {
        const employee = employees?.find((emp: any) => emp.id === stat.employee_id);
        return {
          ...stat,
          employee_name: employee?.name || '(이름 없음)'
        };
      });
      
      return enrichedStats;
    } catch (err) {
      console.error('getUserWorkStats 오류:', err);
      throw err;
    }
  },
  
  // 관리자 계정 생성 함수
  createAdminAccount: async (adminData: {
    id: string,
    password: string,
    name?: string
  }) => {
    try {
      console.log('관리자 계정 생성 중...', adminData.id);
      
      // 이미 존재하는 계정인지 확인
      const { data: existingUser, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', adminData.id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('사용자 확인 중 오류:', checkError);
        throw checkError;
      }
      
      // 사용자가 이미 존재하면 오류
      if (existingUser) {
        throw new Error('이미 존재하는 ID입니다.');
      }
      
      // 관리자 계정 생성 (직접 employees 테이블에 삽입)
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          id: adminData.id,
          name: adminData.name || `관리자_${adminData.id}`,
          password: adminData.password,  // 실제 환경에서는 암호화 필요
          role: 'admin',
          email: `${adminData.id}@example.com`  // 더미 이메일
        }])
        .select()
        .single();
      
      if (error) {
        console.error('관리자 계정 생성 오류:', error);
        throw error;
      }
      
      console.log('관리자 계정 생성 성공:', data);
      
      // 비밀번호 제외하고 반환
      const { password: _, ...userData } = data;
      return userData;
    } catch (err) {
      console.error('관리자 계정 생성 중 오류:', err);
      throw err;
    }
  },
  
  // 일반 직원 계정 등록
  registerEmployee: async (userData: {
    id: string,
    password: string,
    name?: string
  }) => {
    try {
      console.log('직원 계정 등록 중...', userData.id);
      
      // 이미 존재하는 계정인지 확인
      const { data: existingUser, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', userData.id)
        .maybeSingle();
      
      // 에러가 있지만 존재하지 않는 사용자라면 계속 진행
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('사용자 확인 중 오류:', checkError);
        throw checkError;
      }
      
      // 사용자가 이미 존재하면 오류
      if (existingUser) {
        throw new Error('이미 존재하는 ID입니다.');
      }
      
      // 직원 계정 생성
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          id: userData.id,
          name: userData.name || userData.id,
          password: userData.password,  // 실제 환경에서는 암호화 필요
          role: 'employee',  // 기본값은 일반 직원
          email: `${userData.id}@example.com`  // 더미 이메일
        }])
        .select()
        .single();
      
      if (error) {
        console.error('직원 계정 생성 오류:', error);
        throw error;
      }
      
      console.log('직원 계정 생성 성공:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('직원 계정 등록 중 오류:', err);
      return { data: null, error: err };
    }
  },
  
  // 기존 사용자를 관리자로 승급
  promoteToAdmin: async (userId: string) => {
    try {
      console.log('사용자를 관리자로 승급 중...', userId);
      
      const { data, error } = await supabase
        .from('employees')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('관리자 승급 오류:', error);
        throw error;
      }
      
      console.log('관리자 승급 성공:', data);
      
      // 비밀번호 제외하고 반환
      const { password: _, ...userData } = data;
      return userData;
    } catch (err) {
      console.error('관리자 승급 중 오류:', err);
      throw err;
    }
  },
  
  // 현재 등록된 직원 정보 확인
  getEmployeeByIdOrEmail: async (idOrEmail: string) => {
    try {
      console.log('직원 정보 조회 중...', idOrEmail);
      
      // ID로 검색
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`)
        .limit(1);
      
      if (error) {
        console.error('직원 정보 조회 오류:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('직원 정보 조회 성공:', data[0]);
        
        // 비밀번호 제외하고 반환
        const { password: _, ...userData } = data[0];
        return userData;
      }
      
      return null;
    } catch (err) {
      console.error('직원 정보 조회 중 오류:', err);
      throw err;
    }
  },
  
  // 직원의 기본 근무 시간 목록 가져오기
  getDefaultSchedules: async (employeeId: string) => {
    try {
      console.log('기본 근무 시간 조회 중...', employeeId);
      
      const { data, error } = await supabase
        .from('default_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('기본 근무 시간 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 기본 근무 시간:', data);
      return data;
    } catch (err) {
      console.error('getDefaultSchedules 오류:', err);
      throw err;
    }
  },
  
  // 모든 직원의 기본 근무 시간 목록 가져오기
  getAllDefaultSchedules: async () => {
    try {
      console.log('모든 직원의 기본 근무 시간 조회 중...');
      
      const { data, error } = await supabase
        .from('default_schedules')
        .select('*, employees(id, name)')
        .order('employee_id', { ascending: true })
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('모든 기본 근무 시간 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 모든 기본 근무 시간:', data);
      return data;
    } catch (err) {
      console.error('getAllDefaultSchedules 오류:', err);
      throw err;
    }
  },
  
  // 기본 근무 시간 추가
  addDefaultSchedule: async (scheduleData: {
    employeeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => {
    try {
      console.log('기본 근무 시간 추가 중...', scheduleData);
      
      // 유효성 검사
      if (scheduleData.dayOfWeek < 0 || scheduleData.dayOfWeek > 6) {
        throw new Error('요일은 0(일요일)부터 6(토요일)까지의 값이어야 합니다.');
      }
      
      // 시간 형식 검사 (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(scheduleData.startTime) || !timeRegex.test(scheduleData.endTime)) {
        throw new Error('시간은 HH:MM 형식이어야 합니다.');
      }
      
      const { data, error } = await supabase
        .from('default_schedules')
        .insert([{
          employee_id: scheduleData.employeeId,
          day_of_week: scheduleData.dayOfWeek,
          start_time: scheduleData.startTime,
          end_time: scheduleData.endTime
        }])
        .select();
      
      if (error) {
        console.error('기본 근무 시간 추가 오류:', error);
        throw error;
      }
      
      console.log('기본 근무 시간 추가 성공:', data);
      return data[0];
    } catch (err) {
      console.error('addDefaultSchedule 오류:', err);
      throw err;
    }
  },
  
  // 기본 근무 시간 업데이트
  updateDefaultSchedule: async (
    scheduleId: string,
    scheduleData: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
    }
  ) => {
    try {
      console.log('기본 근무 시간 업데이트 중...', scheduleId, scheduleData);
      
      // 업데이트할 데이터 구성
      const updateData: any = {};
      
      if (scheduleData.dayOfWeek !== undefined) {
        if (scheduleData.dayOfWeek < 0 || scheduleData.dayOfWeek > 6) {
          throw new Error('요일은 0(일요일)부터 6(토요일)까지의 값이어야 합니다.');
        }
        updateData.day_of_week = scheduleData.dayOfWeek;
      }
      
      // 시간 형식 검사 (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      
      if (scheduleData.startTime !== undefined) {
        if (!timeRegex.test(scheduleData.startTime)) {
          throw new Error('시작 시간은 HH:MM 형식이어야 합니다.');
        }
        updateData.start_time = scheduleData.startTime;
      }
      
      if (scheduleData.endTime !== undefined) {
        if (!timeRegex.test(scheduleData.endTime)) {
          throw new Error('종료 시간은 HH:MM 형식이어야 합니다.');
        }
        updateData.end_time = scheduleData.endTime;
      }
      
      const { data, error } = await supabase
        .from('default_schedules')
        .update(updateData)
        .eq('id', scheduleId)
        .select();
      
      if (error) {
        console.error('기본 근무 시간 업데이트 오류:', error);
        throw error;
      }
      
      console.log('기본 근무 시간 업데이트 성공:', data);
      return data[0];
    } catch (err) {
      console.error('updateDefaultSchedule 오류:', err);
      throw err;
    }
  },
  
  // 기본 근무 시간 삭제
  deleteDefaultSchedule: async (scheduleId: string) => {
    try {
      console.log('기본 근무 시간 삭제 중...', scheduleId);
      
      const { error } = await supabase
        .from('default_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) {
        console.error('기본 근무 시간 삭제 오류:', error);
        throw error;
      }
      
      console.log('기본 근무 시간 삭제 성공');
      return true;
    } catch (err) {
      console.error('deleteDefaultSchedule 오류:', err);
      throw err;
    }
  }
}; 