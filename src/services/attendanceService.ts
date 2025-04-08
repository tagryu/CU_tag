import { supabase } from './supabase';
import { Attendance, MonthlyReport, User, AttendanceRecord, ReportData } from '../types';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

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
  
  // 특정 직원의 근무 기록 가져오기
  getAttendanceByEmployee: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    try {
      console.log(`${employeeId} 직원의 ${startDate}부터 ${endDate}까지의 근무 기록 조회 중...`);
      
      // 기간 내 모든 근무 기록 조회
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('근무 기록 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 근무 기록:', data);
      
      // 날짜 기준으로 정렬 (내림차순)
      const sortedData = [...(data || [])].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // UI용으로 데이터 변환
      const formattedRecords: AttendanceRecord[] = sortedData.map(record => ({
        id: record.id,
        employeeId: record.employee_id,
        date: record.date,
        start_time: record.start_time,
        end_time: record.end_time,
        startDateTime: `${record.date}T${record.start_time}`,
        endDateTime: record.cross_day 
          ? `${dayjs(record.date).add(1, 'day').format('YYYY-MM-DD')}T${record.end_time}` 
          : `${record.date}T${record.end_time}`,
        totalHours: record.total_hours || 0,
        notes: record.notes || '',
        cross_day: record.cross_day || false
      }));
      
      return formattedRecords;
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
    try {
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]);
      const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // 해당 월의 마지막 날
      
      console.log('월간 보고서 기간:', startDate, endDate);
      
      // attendances 테이블에서만 데이터 조회
      const { data: records, error } = await supabase
        .from('attendances')
        .select(`
          id,
          employee_id,
          date,
          start_time,
          end_time,
          total_hours,
          notes,
          employees (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('월간 보고서 데이터 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 월간 보고서 데이터:', records);
      
      // 데이터 변환
      const formattedRecords = records.map((record: any) => ({
        id: record.id,
        employee_id: record.employee_id,
        date: record.date,
        start_time: record.start_time,
        end_time: record.end_time,
        total_hours: record.total_hours,
        notes: record.notes || '',
        employee_name: record.employees?.name || '알 수 없음'
      }));

      return formattedRecords;
    } catch (err) {
      console.error('getAttendanceByMonth 오류:', err);
      throw err;
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
      
      // 날짜가 다른 경우 처리
      const isSameDay = startDate === endDate;
      let totalHours = 0;
      
      // 총 근무 시간 계산
      const startMoment = dayjs(startDateTime);
      const endMoment = dayjs(endDateTime);
      totalHours = endMoment.diff(startMoment, 'hour', true);
      
      // 총 시간이 음수인 경우 처리 (잘못된 입력으로 간주)
      if (totalHours < 0) {
        throw new Error('종료 시간은 시작 시간 이후여야 합니다.');
      }
      
      console.log('계산된 총 근무 시간:', totalHours);
      
      // 데이터베이스 레코드 구성
      const dbRecord: any = {
        employee_id: employeeId,
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        // 서로 다른 날짜인 경우에도 총 시간을 제대로 기록
        total_hours: parseFloat(totalHours.toFixed(2)),
        cross_day: !isSameDay // 날짜를 넘기는 경우 표시
      };
      
      // 메모 추가
      if (notes) {
        dbRecord.notes = notes;
      }
      
      console.log('저장할 근무 기록:', dbRecord);
      
      // Supabase에 레코드 추가
      const { data, error } = await supabase
        .from('attendances')
        .insert(dbRecord)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase 오류:', error);
        throw new Error(`근무 기록 추가 중 오류가 발생했습니다: ${error.message}`);
      }
      
      console.log('근무 기록 추가 완료:', data);
      
      // AttendanceRecord 형식으로 변환하여 반환
      return {
        id: data.id,
        employeeId: data.employee_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        startDateTime: `${data.date}T${data.start_time}`,
        endDateTime: `${endDate}T${endTime}`,
        totalHours: data.total_hours,
        notes: data.notes || '',
        cross_day: data.cross_day || false
      };
    } catch (err: any) {
      console.error('addAttendance 오류:', err);
      throw new Error(err?.message || '근무 기록 추가 중 오류가 발생했습니다.');
    }
  },
  
  // 근태 기록 수정
  updateAttendance: async (
    id: string,
    {
      employeeId,
      startDateTime,
      endDateTime,
      notes,
      cross_day
    }: {
      employeeId: string;
      startDateTime: string;
      endDateTime: string;
      notes?: string;
      cross_day?: boolean;
    }
  ): Promise<AttendanceRecord> => {
    try {
      console.log('근무 기록 업데이트 중:', { id, employeeId, startDateTime, endDateTime, notes, cross_day });
      
      // 날짜 및 시간 데이터 처리
      const startDate = startDateTime.split('T')[0];
      const startTime = startDateTime.split('T')[1].substring(0, 5);
      
      const endDate = endDateTime.split('T')[0];
      const endTime = endDateTime.split('T')[1].substring(0, 5);
      
      // 데이터 유효성 검사
      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error('날짜와 시간 형식이 올바르지 않습니다.');
      }
      
      // 현재 레코드 가져오기
      const { data: currentRecord, error: fetchError } = await supabase
        .from('attendances')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !currentRecord) {
        console.error('기존 근무 기록 조회 오류:', fetchError);
        throw new Error('수정할 근무 기록을 찾을 수 없습니다.');
      }
      
      // 총 근무 시간 계산
      const startMoment = dayjs(startDateTime);
      const endMoment = dayjs(endDateTime);
      const totalHours = endMoment.diff(startMoment, 'hour', true);
      
      // 총 시간이 음수인 경우 처리 (잘못된 입력으로 간주)
      if (totalHours < 0) {
        throw new Error('종료 시간은 시작 시간 이후여야 합니다.');
      }
      
      console.log('계산된 총 근무 시간 (수정):', totalHours);
      
      // 다른 날짜에 걸친 경우인지 확인
      const isCrossDay = startDate !== endDate || !!cross_day;
      
      // 데이터베이스 레코드 업데이트
      const updateRecord: any = {
        date: startDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: parseFloat(totalHours.toFixed(2)),
        cross_day: isCrossDay
      };
      
      // 직원 ID 추가 (변경된 경우)
      if (employeeId) {
        updateRecord.employee_id = employeeId;
      }
      
      // 메모 업데이트
      updateRecord.notes = notes || '';
      
      console.log('업데이트할 근무 기록:', updateRecord);
      
      // Supabase에 레코드 업데이트
      const { data, error } = await supabase
        .from('attendances')
        .update(updateRecord)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('근무 기록 업데이트 오류:', error);
        throw new Error(`근무 기록 업데이트 중 오류가 발생했습니다: ${error.message}`);
      }
      
      console.log('업데이트된 근무 기록:', data);
      
      // AttendanceRecord 형식으로 변환하여 반환
      return {
        id: data.id,
        employeeId: data.employee_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        startDateTime: `${data.date}T${data.start_time}`,
        endDateTime: data.cross_day
          ? `${dayjs(data.date).add(1, 'day').format('YYYY-MM-DD')}T${data.end_time}`
          : `${data.date}T${data.end_time}`,
        totalHours: data.total_hours,
        notes: data.notes || '',
        cross_day: data.cross_day || false
      };
    } catch (err: any) {
      console.error('updateAttendance 오류:', err);
      throw new Error(err?.message || '근무 기록 수정 중 오류가 발생했습니다.');
    }
  },
  
  // 근태 기록 삭제
  deleteAttendance: async (id: string): Promise<void> => {
    try {
      console.log('근무 기록 삭제 중:', id);
      
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('근무 기록 삭제 오류:', error);
        throw new Error(`근무 기록 삭제 중 오류가 발생했습니다: ${error.message}`);
      }
      
      console.log('근무 기록 삭제 완료');
    } catch (err: any) {
      console.error('deleteAttendance 오류:', err);
      throw new Error(err?.message || '근무 기록 삭제 중 오류가 발생했습니다.');
    }
  },
  
  // 월별 보고서 생성 및 다운로드
  generateMonthlyReport: async (month: string): Promise<any> => {
    try {
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]);
      const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // 해당 월의 마지막 날
      
      console.log('월간 보고서 기간:', startDate, endDate);
      
      // 직원 목록 가져오기
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('id, name')
        .order('name', { ascending: true });
        
      if (employeeError) {
        console.error('직원 목록 조회 오류:', employeeError);
        throw employeeError;
      }
      
      // 해당 월의 모든 근무 기록 가져오기
      const { data: records, error } = await supabase
        .from('attendances')
        .select(`
          id,
          employee_id,
          date,
          start_time,
          end_time,
          total_hours,
          cross_day
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('월간 보고서 데이터 조회 오류:', error);
        throw error;
      }
      
      console.log('조회된 월간 보고서 데이터:', records);

      // 해당 월의 모든 날짜 생성 (1일부터 말일까지)
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      // 데이터 가공: 직원별, 날짜별 근무 시간
      const employeeHours: Record<string, Record<number, number>> = {};
      const employeeNames: Record<string, string> = {};
      
      // 각 직원의 기본 데이터 초기화
      employees.forEach(emp => {
        employeeHours[emp.id] = {};
        employeeNames[emp.id] = emp.name;
        
        // 모든 날짜 초기화
        for (let i = 1; i <= daysInMonth; i++) {
          employeeHours[emp.id][i] = 0;
        }
      });
      
      // 근무 기록으로 시간 채우기
      records.forEach(record => {
        const employeeId = record.employee_id;
        const date = new Date(record.date);
        const day = date.getDate(); // 일자만 추출 (1-31)
        
        // 해당 직원 ID가 있을 경우에만 처리
        if (employeeHours[employeeId]) {
          // 해당 날짜에 시간 추가
          employeeHours[employeeId][day] = (employeeHours[employeeId][day] || 0) + record.total_hours;
        }
      });
      
      // 엑셀 워크시트 데이터 생성
      const worksheetData: any[] = [];
      
      // 첫 번째 행: 빈칸으로 시작 + 1일~15일
      const firstRow = [''];
      for (let i = 1; i <= 15; i++) {
        firstRow.push(`${i}일`);
      }
      worksheetData.push(firstRow);
      
      // 두 번째 행: 빈칸으로 시작 + 16일~말일
      const secondRow = [''];
      for (let i = 16; i <= daysInMonth; i++) {
        secondRow.push(`${i}일`);
      }
      worksheetData.push(secondRow);
      
      // 직원 및 역할별 데이터 행 추가
      const roles = [
        { title: '직원1(결근 오전)', key: '직원1' },
        { title: '류동희(주말 야간)', key: '류동희' },
        { title: '관리자', key: '관리자' }
      ];
      
      // 직원별 근무 시간 데이터 + 역할별 행 추가
      [...Object.keys(employeeHours), ...roles.map(r => r.key)].forEach((key, index) => {
        const isEmployee = employeeNames[key] !== undefined;
        const name = isEmployee ? employeeNames[key] : roles.find(r => r.key === key)?.title || key;
        
        // 빈 행 추가 (구분선)
        if (!isEmployee && index > 0) {
          worksheetData.push([]);
        }
        
        // 첫 번째 행 (1일~15일)
        const firstHalfRow = [name];
        for (let i = 1; i <= 15; i++) {
          // 직원인 경우 근무 시간 추가, 역할인 경우 빈칸
          if (isEmployee) {
            const hours = employeeHours[key][i];
            firstHalfRow.push(hours > 0 ? hours.toFixed(1) : '0');
          } else {
            firstHalfRow.push('0');
          }
        }
        worksheetData.push(firstHalfRow);
        
        // 두 번째 행 (16일~말일) - 직원인 경우에만
        if (isEmployee) { 
          const secondHalfRow = [''];
          for (let i = 16; i <= daysInMonth; i++) {
            const hours = employeeHours[key][i];
            secondHalfRow.push(hours > 0 ? hours.toFixed(1) : '0');
          }
          worksheetData.push(secondHalfRow);
        }
      });
      
      return worksheetData;
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
    end_date?: string;
    notes?: string;
  }): Promise<AttendanceRecord> => {
    try {
      // 기본값 설정
      const recordData = {
        employee_id: data.employee_id,
        date: data.date,
        start_time: data.start_time || '09:00:00',
        end_time: data.end_time || '18:00:00',
        end_date: data.end_date || data.date,
        total_hours: 0
      };
      
      // 시작 시간과 종료 시간이 있는 경우 총 시간 계산
      if (data.start_time && data.end_time) {
        let totalHours = 0;

        if (recordData.date === recordData.end_date) {
          // 같은 날짜인 경우
          const startTime = new Date(`${data.date}T${data.start_time}`);
          const endTime = new Date(`${data.date}T${data.end_time}`);
          totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          
          // 시간이 음수인 경우 (오버나이트 근무)
          if (totalHours < 0) {
            totalHours += 24;
          }
        } else {
          // 다른 날짜인 경우
          const startTime = new Date(`${data.date}T${data.start_time}`);
          const endTime = new Date(`${data.end_date || data.date}T${data.end_time}`);
          totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        }
        
        recordData.total_hours = totalHours;
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
        endDateTime: `${record.end_date || record.date}T${record.end_time}`,
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
      
      // 같은 날짜의 연속된 기록 찾기 (예: 자정을 넘긴 기록)
      const processedRecords: AttendanceRecord[] = [];
      const processedIds = new Set<string>();
      
      // 날짜별로 정렬
      const sortedData = [...(data || [])].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      for (let i = 0; i < sortedData.length; i++) {
        const record = sortedData[i];
        
        // 이미 처리한 레코드 건너뛰기
        if (processedIds.has(record.id)) continue;
        
        // 시작 시간이 00:00인 레코드 찾기 (다음 날로 이어진 기록일 가능성)
        if (record.start_time === '00:00' && i > 0) {
          // 이전 날짜의 레코드 찾기
          const prevDate = new Date(record.date);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          
          // 이전 날짜의 레코드 중 종료 시간이 23:59인 레코드 찾기
          const prevRecord = sortedData.find(r => 
            r.date === prevDateStr && 
            r.end_time === '23:59' &&
            r.employee_id === record.employee_id
          );
          
          if (prevRecord) {
            // 이전 레코드와 현재 레코드를 합쳐서 하나의 레코드로 처리
            processedIds.add(record.id);
            processedIds.add(prevRecord.id);
            
            processedRecords.push({
              id: prevRecord.id,
              employeeId: prevRecord.employee_id,
              employeeName: prevRecord.employees?.name || record.employees?.name || '알 수 없음',
              startDateTime: `${prevRecord.date}T${prevRecord.start_time}`,
              endDateTime: `${record.date}T${record.end_time}`,
              totalHours: (prevRecord.total_hours || 0) + (record.total_hours || 0),
              notes: prevRecord.notes || record.notes || '',
              status: record.status || prevRecord.status || 'pending',
              overnight: true // 야간 근무 표시
            });
            continue;
          }
        }
        
        // 일반 레코드 처리
        if (!processedIds.has(record.id)) {
          processedIds.add(record.id);
          processedRecords.push({
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employees?.name || '알 수 없음',
            startDateTime: `${record.date}T${record.start_time}`,
            endDateTime: `${record.date}T${record.end_time}`,
            totalHours: record.total_hours,
            notes: record.notes || '',
            status: record.status || 'pending',
            overnight: false
          });
        }
      }
      
      return {
        data: processedRecords,
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
      
      // 같은 날짜의 연속된 기록 찾기 (예: 자정을 넘긴 기록)
      const processedRecords: any[] = [];
      const processedIds = new Set<string>();
      
      // 날짜별로 정렬
      const sortedData = [...(data || [])].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      for (let i = 0; i < sortedData.length; i++) {
        const record = sortedData[i];
        
        // 이미 처리한 레코드 건너뛰기
        if (processedIds.has(record.id)) continue;
        
        // 시작 시간이 00:00인 레코드 찾기 (다음 날로 이어진 기록일 가능성)
        if (record.start_time === '00:00' && i > 0) {
          // 이전 날짜의 레코드 찾기
          const prevDate = new Date(record.date);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          
          // 이전 날짜의 레코드 중 종료 시간이 23:59인 레코드 찾기
          const prevRecord = sortedData.find(r => 
            r.date === prevDateStr && 
            r.end_time === '23:59' &&
            r.employee_id === record.employee_id
          );
          
          if (prevRecord) {
            // 이전 레코드와 현재 레코드를 합쳐서 하나의 레코드로 처리
            processedIds.add(record.id);
            processedIds.add(prevRecord.id);
            
            // 자정을 넘긴 기록을 하나로 합치기 (첫째 날 레코드 기준)
            processedRecords.push({
              id: prevRecord.id,
              employee_id: prevRecord.employee_id,
              employee_name: prevRecord.employees?.name || record.employees?.name || '알 수 없음',
              date: prevRecord.date,
              start_time: prevRecord.start_time,
              end_time: record.end_time,
              total_hours: (prevRecord.total_hours || 0) + (record.total_hours || 0),
              notes: (prevRecord.notes || '') + ' ' + (record.notes || '')
            });
            continue;
          }
        }
        
        // 일반 레코드 처리
        if (!processedIds.has(record.id)) {
          processedIds.add(record.id);
          processedRecords.push({
            id: record.id,
            employee_id: record.employee_id,
            employee_name: record.employees?.name || '알 수 없음',
            date: record.date,
            start_time: record.start_time,
            end_time: record.end_time,
            total_hours: record.total_hours,
            notes: record.notes || ''
          });
        }
      }
      
      return processedRecords;
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