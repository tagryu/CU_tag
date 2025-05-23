import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Container,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Stack,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  SvgIcon,
  Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker, DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord, DefaultSchedule, DAY_OF_WEEK_NAMES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import 'dayjs/locale/ko';

// 커스텀 아이콘 컴포넌트를 직접 정의
const EditIcon = () => (
  <SvgIcon>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </SvgIcon>
);

const DeleteIcon = () => (
  <SvgIcon>
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </SvgIcon>
);

const AccessTimeIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </SvgIcon>
);

const ContentCopyIcon = () => (
  <SvgIcon>
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </SvgIcon>
);

const EventNoteIcon = () => (
  <SvgIcon>
    <path d="M17 10H7v2h10v-2zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-5H7v2h7v-2z" />
  </SvgIcon>
);

// 근무 시간 계산 함수
const calculateHours = (startDateTime: string, endDateTime: string): string => {
  if (!startDateTime || !endDateTime) return '0';
  
  const start = dayjs(startDateTime);
  const end = dayjs(endDateTime);
  const diffHours = end.diff(start, 'hour', true);
  
  // 음수인 경우 24시간을 더함 (오버나이트 근무)
  const hours = diffHours < 0 ? diffHours + 24 : diffHours;
  
  return hours.toFixed(1);
};

const TimeKeeper = () => {
  const [startDateTime, setStartDateTime] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDateTime, setEndDateTime] = useState<dayjs.Dayjs | null>(dayjs().add(8, 'hour'));
  const [notes, setNotes] = useState('');
  const [employee, setEmployee] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);
  const [todayDate] = useState(dayjs().format('YYYY년 MM월 DD일'));
  
  // 수정 관련 상태 추가
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editStartDateTime, setEditStartDateTime] = useState<dayjs.Dayjs | null>(null);
  const [editEndDateTime, setEditEndDateTime] = useState<dayjs.Dayjs | null>(null);
  const [editNotes, setEditNotes] = useState('');
  
  // 삭제 확인 관련 상태 추가
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // 작업 시간 표시용 상태
  const [totalHours, setTotalHours] = useState<number | null>(null);

  // 시간 중복 확인 관련 상태 추가
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateRecords, setDuplicateRecords] = useState<any[]>([]);
  const [pendingRecord, setPendingRecord] = useState<any>(null);
  
  // 기본 근무 시간 관련 상태 추가
  const [defaultSchedules, setDefaultSchedules] = useState<DefaultSchedule[]>([]);
  const [defaultScheduleDialogOpen, setDefaultScheduleDialogOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadEmployees();
    checkDatabaseStructure();
    
    // 비관리자 사용자의 경우 자동으로 본인의 ID 설정
    if (!isAdmin && user?.id) {
      console.log('현재 사용자 ID 설정:', user.id);
      setEmployee(user.id);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (employee) {
      console.log('직원 ID가 선택됨, 최근 기록 로드:', employee);
      loadRecentAttendances();
      loadDefaultSchedules();
    }
  }, [employee]);

  // 작업 시간 계산
  useEffect(() => {
    if (startDateTime && endDateTime) {
      const hours = endDateTime.diff(startDateTime, 'hour', true);
      setTotalHours(hours > 0 ? hours : null);
    } else {
      setTotalHours(null);
    }
  }, [startDateTime, endDateTime]);

  const loadEmployees = async () => {
    try {
      console.log('직원 목록 로드 중...');
      const employeeList = await attendanceService.getEmployees();
      console.log('로드된 직원 목록:', employeeList);
      setEmployees(employeeList);
      
      // 관리자인 경우 첫 번째 직원을 기본값으로 설정
      if (isAdmin && employeeList.length > 0 && !employee) {
        setEmployee(employeeList[0].id);
      }
    } catch (err) {
      console.error('직원 목록 로드 중 오류:', err);
      setError('직원 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadRecentAttendances = async () => {
    try {
      if (!employee) return;
      
      console.log('오늘 출석 기록 로드 중... 직원 ID:', employee);
      const todayStart = dayjs().startOf('day').format('YYYY-MM-DD');
      const todayEnd = dayjs().endOf('day').format('YYYY-MM-DD');
      
      console.log('조회 기간:', todayStart, '~', todayEnd);
      
      // attendances 테이블에서만 근무 기록 조회
      const records = await attendanceService.getAttendanceByEmployee(
        employee,
        todayStart,
        todayEnd
      );
      
      console.log('조회된 근무 기록:', records);
      
      // 날짜 순으로 정렬
      records.sort((a, b) => 
        new Date(b.startDateTime || '').getTime() - new Date(a.startDateTime || '').getTime()
      );
      
      setRecentAttendances(records);
    } catch (err) {
      console.error('오늘 출석 기록 로드 중 오류:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!startDateTime || !endDateTime) {
        setError('시작 시간과 종료 시간을 모두 입력해주세요.');
        return;
      }

      // 총 시간이 음수라면 종료 시간이 시작 시간보다 이전이란 의미
      const diffHours = endDateTime.diff(startDateTime, 'hour', true);
      if (diffHours < 0) {
        setError('종료 시간은 시작 시간 이후로 설정해주세요.');
        return;
      }
      
      // employee가 빈 문자열이 아니라면 진행
      if (!employee) {
        console.error('직원 ID가 선택되지 않았습니다.');
        setError('직원을 선택해주세요.');
        return;
      }

      // 현재 선택된 시작 시간과 종료 시간을 정확히 보존
      // dayjs 포맷을 사용하여 ISO 문자열로 변환, 초 단위까지 정확히 지정
      const startDateTimeStr = startDateTime.format('YYYY-MM-DDTHH:mm:00');
      const endDateTimeStr = endDateTime.format('YYYY-MM-DDTHH:mm:00');
      
      // 시간대 확인 로깅
      console.log('선택한 시작 시간:', startDateTime.format('YYYY-MM-DD HH:mm'));
      console.log('선택한 종료 시간:', endDateTime.format('YYYY-MM-DD HH:mm'));
      console.log('날짜 다름 여부:', startDateTime.format('YYYY-MM-DD') !== endDateTime.format('YYYY-MM-DD'));
      console.log('변환된 시작 시간 문자열:', startDateTimeStr);
      console.log('변환된 종료 시간 문자열:', endDateTimeStr);

      const attendanceRecord = {
        employeeId: employee,
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        notes: notes || ''
      };
      
      console.log('전송할 근무 기록:', attendanceRecord);

      // 근무 시간 중복 확인
      const startDateStr = startDateTime.format('YYYY-MM-DD');
      const endDateStr = endDateTime.format('YYYY-MM-DD');
      
      try {
        const { supabase } = await import('../services/supabase');
        
        // 시작 날짜에 등록된 모든 근무 기록 조회
        const { data: startDateRecords, error: startDateError } = await supabase
          .from('attendances')
          .select('*, employees(name)')
          .eq('date', startDateStr)
          .eq('employee_id', employee);
        
        if (startDateError) {
          console.error('근무 기록 중복 확인 중 오류:', startDateError);
        }
        
        // 종료 날짜에 등록된 모든 근무 기록 조회 (다른 날짜인 경우)
        let endDateRecords: any[] = [];
        if (startDateStr !== endDateStr) {
          const { data: endDateData, error: endDateError } = await supabase
            .from('attendances')
            .select('*, employees(name)')
            .eq('date', endDateStr)
            .eq('employee_id', employee);
          
          if (endDateError) {
            console.error('종료 날짜 근무 기록 중복 확인 중 오류:', endDateError);
          } else if (endDateData) {
            endDateRecords = endDateData;
          }
        }
        
        // 모든 관련 레코드 결합
        const allRecords = [...(startDateRecords || []), ...endDateRecords];
        
        if (allRecords.length > 0) {
          console.log('해당 날짜들의 모든 근무 기록:', allRecords);
          
          // 시간 중복 확인 로직
          const isOverlapping = allRecords.some(record => {
            const recordStartDateTime = `${record.date}T${record.start_time}`;
            
            // cross_day가 true인 경우 종료 시간은 다음 날
            const recordEndDate = record.cross_day
              ? dayjs(record.date).add(1, 'day').format('YYYY-MM-DD')
              : record.date;
            const recordEndDateTime = `${recordEndDate}T${record.end_time}`;
            
            // 시간 겹침 확인
            return (
              (startDateTimeStr <= recordEndDateTime && endDateTimeStr >= recordStartDateTime) ||
              (recordStartDateTime <= endDateTimeStr && recordEndDateTime >= startDateTimeStr)
            );
          });
          
          if (isOverlapping) {
            // 중복 확인 대화상자 표시
            setDuplicateRecords(allRecords);
            setPendingRecord(attendanceRecord);
            setDuplicateDialogOpen(true);
            return;
          }
        }
        
        // 중복이 없으면 저장 진행
        await saveAttendanceRecord(attendanceRecord);
        
      } catch (err) {
        console.error('중복 확인 중 오류:', err);
        // 중복 확인 오류는 무시하고 저장 진행
        await saveAttendanceRecord(attendanceRecord);
      }
    } catch (err: any) {
      console.error('근무 시간 등록 중 오류:', err);
      setError(err?.message || '근무 시간 등록 중 오류가 발생했습니다.');
    }
  };

  // 실제 근무 기록 저장 함수 (중복 확인 후 호출)
  const saveAttendanceRecord = async (record: any) => {
    try {
      const result = await attendanceService.addAttendance(record);
      console.log('저장 성공:', result);
      
      setSuccess('근무 시간이 성공적으로 등록되었습니다.');
      loadRecentAttendances();
      
      // 폼 초기화
      setStartDateTime(dayjs());
      setEndDateTime(dayjs().add(8, 'hour'));
      setNotes('');
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('근무 시간 등록 중 오류:', err);
      setError(err?.message || '근무 시간 등록 중 오류가 발생했습니다.');
    }
  };

  // 중복 기록 무시하고 계속 진행
  const handleDuplicateConfirm = async () => {
    if (pendingRecord) {
      await saveAttendanceRecord(pendingRecord);
    }
    setDuplicateDialogOpen(false);
    setPendingRecord(null);
    setDuplicateRecords([]);
  };

  // 중복 기록 취소
  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setPendingRecord(null);
    setDuplicateRecords([]);
    setError('시간이 중복되어 등록이 취소되었습니다.');
  };

  // 데이터베이스 테이블 구조 확인
  const checkDatabaseStructure = async () => {
    try {
      const { supabase } = await import('../services/supabase');
      
      // attendances 테이블을 직접 조회해서 확인
      const { data: attendances, error: attendancesError } = await supabase
        .from('attendances')
        .select('id')
        .limit(1);
        
      if (attendancesError) {
        console.error('attendances 테이블 조회 오류:', attendancesError);
      } else {
        console.log('attendances 테이블 접근 성공');
      }
      
      // employees 테이블을 직접 조회해서 확인
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name')
        .limit(5);
        
      if (employeesError) {
        console.error('employees 테이블 조회 오류:', employeesError);
      } else {
        console.log('employees 테이블 접근 성공, 데이터:', employees);
      }
    } catch (err) {
      console.error('데이터베이스 구조 확인 오류:', err);
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (record: AttendanceRecord) => {
    console.log('편집할 기록:', record);
    
    // 날짜 및 시간 문자열 가져오기
    const startDateTimeStr = record.startDateTime || '';
    const endDateTimeStr = record.endDateTime || '';
    
    console.log('원본 시작 시간:', startDateTimeStr);
    console.log('원본 종료 시간:', endDateTimeStr);
    
    // 기본값 설정 및 유효성 검사
    let startDayjs = dayjs(startDateTimeStr);
    let endDayjs = dayjs(endDateTimeStr);
    
    // 유효하지 않은 날짜/시간인 경우 현재 시간으로 기본값 설정
    if (!startDayjs.isValid()) {
      console.warn('시작 시간이 유효하지 않습니다. 현재 시간으로 설정합니다.');
      startDayjs = dayjs();
    }
    
    if (!endDayjs.isValid()) {
      console.warn('종료 시간이 유효하지 않습니다. 현재 시간으로 설정합니다.');
      endDayjs = dayjs();
    }
    
    // 최종 값 설정
    setEditRecord(record);
    setEditStartDateTime(startDayjs);
    setEditEndDateTime(endDayjs);
    setEditNotes(record.notes || '');
    setEditDialogOpen(true);
  };

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (id: string) => {
    setDeleteRecordId(id);
    setDeleteDialogOpen(true);
  };
  
  // 삭제 확인 핸들러
  const handleDeleteConfirm = async () => {
    try {
      if (!deleteRecordId) return;
      
      await attendanceService.deleteAttendance(deleteRecordId);
      
      setSuccess('근무 기록이 성공적으로 삭제되었습니다.');
      setDeleteDialogOpen(false);
      setDeleteRecordId(null);
      loadRecentAttendances();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('근무 기록 삭제 중 오류:', err);
      setError(err?.message || '근무 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 기본 근무 시간 불러오기
  const loadDefaultSchedules = async () => {
    try {
      if (!employee) return;
      
      console.log('기본 근무 시간 로드 중... 직원 ID:', employee);
      const schedules = await attendanceService.getDefaultSchedules(employee);
      
      console.log('조회된 기본 근무 시간:', schedules);
      setDefaultSchedules(schedules);
    } catch (err) {
      console.error('기본 근무 시간 로드 중 오류:', err);
    }
  };
  
  // 기본 근무 시간 목록 대화상자 열기
  const handleOpenDefaultScheduleDialog = () => {
    setDefaultScheduleDialogOpen(true);
  };
  
  // 기본 근무 시간 템플릿 사용하기
  const handleUseDefaultSchedule = (schedule: DefaultSchedule) => {
    // 오늘 요일 확인
    const today = dayjs();
    
    // 선택한 템플릿의 시작 시간과 종료 시간 가져오기
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    // 오늘 날짜에 시간을 적용
    const newStartDateTime = today.hour(startHour).minute(startMinute).second(0);
    const newEndDateTime = today.hour(endHour).minute(endMinute).second(0);
    
    // 종료 시간이 시작 시간보다 이전인 경우 (오버나이트 근무) 하루 추가
    const adjustedEndDateTime = 
      newEndDateTime.isBefore(newStartDateTime) 
        ? newEndDateTime.add(1, 'day') 
        : newEndDateTime;
    
    // 상태 업데이트
    setStartDateTime(newStartDateTime);
    setEndDateTime(adjustedEndDateTime);
    
    // 대화상자 닫기
    setDefaultScheduleDialogOpen(false);
  };

  // 편집 저장 핸들러
  const handleEditSave = async () => {
    try {
      // 필수 필드 확인
      if (!editRecord || !editStartDateTime || !editEndDateTime) {
        setError('모든 필수 정보를 입력해주세요.');
        return;
      }
      
      // 종료 시간 검증
      if (editStartDateTime.isAfter(editEndDateTime)) {
        setError('종료 시간은 시작 시간 이후로 설정해주세요.');
        return;
      }
      
      // 날짜 및 시간 형식 변환
      const startDateTimeStr = editStartDateTime.format('YYYY-MM-DDTHH:mm:00');
      const endDateTimeStr = editEndDateTime.format('YYYY-MM-DDTHH:mm:00');
      
      console.log('수정된 시작 시간:', startDateTimeStr);
      console.log('수정된 종료 시간:', endDateTimeStr);
      
      // 수정된 기록 생성 (cross_day 필드 추가)
      const startDate = editStartDateTime.format('YYYY-MM-DD');
      const endDate = editEndDateTime.format('YYYY-MM-DD');
      const isCrossDay = startDate !== endDate;
      
      console.log('날짜 다름 여부:', isCrossDay);
      
      const updatedRecord = {
        employeeId: editRecord.employeeId || user?.uid || '',
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        notes: editNotes || '',
        cross_day: isCrossDay
      };
      
      if (!editRecord.id) {
        throw new Error('수정할 기록의 ID가 없습니다.');
      }
      
      // 서비스 호출하여 업데이트
      await attendanceService.updateAttendance(editRecord.id, updatedRecord);
      
      // 성공 메시지 표시
      setSuccess('근무 기록이 성공적으로 수정되었습니다.');
      
      // 다이얼로그 닫기
      setEditDialogOpen(false);
      
      // 데이터 다시 불러오기
      loadRecentAttendances();
    } catch (error) {
      console.error('근무 기록 수정 오류:', error);
      setError('근무 기록 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* 근무 시간 등록 폼 */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 2
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            fontSize: { xs: '1rem', sm: '1.25rem' } 
          }}
        >
          근무 시간 등록
        </Typography>
        
        <Stack spacing={2}>
          {/* 직원 선택 (관리자만) */}
          {isAdmin && (
            <FormControl 
              fullWidth 
              variant="outlined" 
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  backgroundColor: 'white',
                }
              }}
            >
              <InputLabel id="employee-select-label">직원 선택</InputLabel>
              <Select
                labelId="employee-select-label"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                label="직원 선택"
                sx={{ 
                  fontSize: '0.9375rem',
                }}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {/* 시작 시간 */}
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight="medium">시작 시간</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="날짜"
                  value={startDateTime}
                  onChange={(newValue) => {
                    if (newValue && startDateTime) {
                      // 날짜만 변경하고 시간은 유지
                      const updatedDateTime = newValue
                        .hour(startDateTime.hour())
                        .minute(startDateTime.minute());
                      setStartDateTime(updatedDateTime);
                    } else {
                      setStartDateTime(newValue);
                    }
                  }}
                  format="YYYY-MM-DD"
                  sx={{ flex: 1 }}
                />
              </LocalizationProvider>
              
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <TimePicker
                  label="시간"
                  value={startDateTime}
                  onChange={(newValue) => {
                    if (newValue && startDateTime) {
                      // 시간만 변경하고 날짜는 유지
                      const updatedDateTime = startDateTime
                        .hour(newValue.hour())
                        .minute(newValue.minute());
                      setStartDateTime(updatedDateTime);
                    }
                  }}
                  format="HH:mm"
                  ampm={false}
                  sx={{ width: '130px' }}
                  closeOnSelect
                  slots={{
                    textField: (params) => (
                      <TextField
                        {...params}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                              <AccessTimeIcon />
                            </Box>
                          ),
                        }}
                      />
                    ),
                  }}
                />
              </LocalizationProvider>
            </Box>
          </Stack>
          
          {/* 종료 시간 */}
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight="medium">종료 시간</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <DatePicker
                  label="날짜"
                  value={endDateTime}
                  onChange={(newValue) => {
                    if (newValue && endDateTime) {
                      // 날짜만 변경하고 시간은 유지
                      const updatedDateTime = newValue
                        .hour(endDateTime.hour())
                        .minute(endDateTime.minute());
                      setEndDateTime(updatedDateTime);
                    } else {
                      setEndDateTime(newValue);
                    }
                  }}
                  format="YYYY-MM-DD"
                  sx={{ flex: 1 }}
                />
              </LocalizationProvider>
              
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                <TimePicker
                  label="시간"
                  value={endDateTime}
                  onChange={(newValue) => {
                    if (newValue && endDateTime) {
                      // 시간만 변경하고 날짜는 유지
                      const updatedDateTime = endDateTime
                        .hour(newValue.hour())
                        .minute(newValue.minute());
                      setEndDateTime(updatedDateTime);
                    }
                  }}
                  format="HH:mm"
                  ampm={false}
                  sx={{ width: '130px' }}
                  closeOnSelect
                  slots={{
                    textField: (params) => (
                      <TextField
                        {...params}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                              <AccessTimeIcon />
                            </Box>
                          ),
                        }}
                      />
                    ),
                  }}
                />
              </LocalizationProvider>
            </Box>
          </Stack>
          
          {/* 총 근무 시간 표시 */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mt: 1,
              backgroundColor: 'rgba(0, 102, 255, 0.1)',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 'medium',
                fontSize: { xs: '0.875rem', sm: '1rem' } 
              }}
            >
              {startDateTime && endDateTime
                ? `총 근무 시간: ${calculateHours(startDateTime.toISOString(), endDateTime.toISOString())}시간`
                : '시작 및 종료 시간을 선택하세요'}
            </Typography>
          </Paper>
          
          {/* 액션 버튼 */}
          <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleOpenDefaultScheduleDialog}
              startIcon={<AccessTimeIcon />}
              fullWidth
              size="small"
              sx={{ flex: { xs: '1', sm: 'initial' } }}
            >
              기본 근무시간 사용
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!startDateTime || !endDateTime}
              fullWidth
              size="small"
              sx={{ flex: { xs: '1', sm: 'initial' } }}
            >
              등록하기
            </Button>
          </Stack>
        </Stack>
      </Paper>
      
      {/* 최근 근무 기록 */}
      <Card 
        elevation={0} 
        sx={{ 
          mt: 3, 
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: 'white',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            <Typography 
              variant="h6" 
              fontWeight="600"
              sx={{ mb: 0.5 }}
            >
              최근 근무 기록
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
            >
              {recentAttendances.length > 0 
                ? '최근에 등록된 근무 기록입니다.' 
                : '등록된 근무 기록이 없습니다.'}
            </Typography>
          </Box>
          
          {recentAttendances.length > 0 && (
            <List sx={{ 
              p: 0,
              '& .MuiListItem-root': {
                px: { xs: 2, sm: 3 },
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': {
                  borderBottom: 'none',
                },
              }
            }}>
              {recentAttendances.map((attendance, index) => (
                <ListItem 
                  key={attendance.id || index}
                  secondaryAction={
                    isAdmin || attendance.employeeId === user?.id ? (
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={() => openEditDialog(attendance)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={() => handleDeleteClick(attendance.id || '')}
                          color="error" 
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ) : null
                  }
                  sx={{ display: 'block' }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      width: '100%',
                      pr: isAdmin || attendance.employeeId === user?.id ? 8 : 0
                    }}>
                      <Typography 
                        component="div" 
                        variant="subtitle1"
                        fontWeight="medium"
                      >
                        {dayjs(attendance.startDateTime).format('YYYY년 MM월 DD일')}
                      </Typography>
                      <Typography 
                        component="div" 
                        variant="body2"
                        color="primary"
                        fontWeight="medium"
                      >
                        {calculateHours(attendance.startDateTime || '', attendance.endDateTime || '')}시간
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            mr: 0.5
                          }}
                        >
                          <Box component={AccessTimeIcon} sx={{ fontSize: '0.9rem', mr: 0.5 }} />
                        </Box>
                        <span>
                          {attendance.cross_day || attendance.overnight 
                            ? `${dayjs(attendance.startDateTime).format('MM/DD HH:mm')} - ${dayjs(attendance.endDateTime).format('MM/DD HH:mm')}`
                            : `${dayjs(attendance.startDateTime).format('HH:mm')} - ${dayjs(attendance.endDateTime).format('HH:mm')}`
                          }
                        </span>
                      </Box>
                      {(attendance.cross_day || attendance.overnight) && 
                        <Chip 
                          label="야간" 
                          size="small" 
                          color="secondary" 
                          sx={{ 
                            height: '16px', 
                            fontSize: '0.65rem',
                            ml: 0.5
                          }} 
                        />
                      }
                    </Typography>
                    
                    {attendance.notes && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          mt: 0.5,
                          p: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 1,
                        }}
                      >
                        {attendance.notes}
                      </Typography>
                    )}
                    
                    {!isAdmin && attendance.employeeId !== user?.id && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ fontStyle: 'italic', mt: 1 }}
                      >
                        수정은 관리자만 가능합니다
                      </Typography>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
      
      {/* 수정 다이얼로그 */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          fontWeight: 'bold'
        }}>
          근무 기록 수정
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Stack spacing={3}>
            {/* 시작 시간 */}
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight="medium">시작 시간</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="날짜"
                    value={editStartDateTime}
                    onChange={(newValue) => {
                      if (newValue && editStartDateTime) {
                        // 날짜만 변경하고 시간은 유지
                        const updatedDateTime = newValue
                          .hour(editStartDateTime.hour())
                          .minute(editStartDateTime.minute());
                        setEditStartDateTime(updatedDateTime);
                      } else {
                        setEditStartDateTime(newValue);
                      }
                    }}
                    format="YYYY-MM-DD"
                    sx={{ flex: 1 }}
                  />
                </LocalizationProvider>
                
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <TimePicker
                    label="시간"
                    value={editStartDateTime}
                    onChange={(newValue) => {
                      if (newValue && editStartDateTime) {
                        // 시간만 변경하고 날짜는 유지
                        const updatedDateTime = editStartDateTime
                          .hour(newValue.hour())
                          .minute(newValue.minute());
                        setEditStartDateTime(updatedDateTime);
                      }
                    }}
                    format="HH:mm"
                    ampm={false}
                    sx={{ width: '130px' }}
                    closeOnSelect
                    slots={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                                <AccessTimeIcon />
                              </Box>
                            ),
                          }}
                        />
                      ),
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </Stack>
            
            {/* 종료 시간 */}
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight="medium">종료 시간</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="날짜"
                    value={editEndDateTime}
                    onChange={(newValue) => {
                      if (newValue && editEndDateTime) {
                        // 날짜만 변경하고 시간은 유지
                        const updatedDateTime = newValue
                          .hour(editEndDateTime.hour())
                          .minute(editEndDateTime.minute());
                        setEditEndDateTime(updatedDateTime);
                      } else {
                        setEditEndDateTime(newValue);
                      }
                    }}
                    format="YYYY-MM-DD"
                    sx={{ flex: 1 }}
                  />
                </LocalizationProvider>
                
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <TimePicker
                    label="시간"
                    value={editEndDateTime}
                    onChange={(newValue) => {
                      if (newValue && editEndDateTime) {
                        // 시간만 변경하고 날짜는 유지
                        const updatedDateTime = editEndDateTime
                          .hour(newValue.hour())
                          .minute(newValue.minute());
                        setEditEndDateTime(updatedDateTime);
                      }
                    }}
                    format="HH:mm"
                    ampm={false}
                    sx={{ width: '130px' }}
                    closeOnSelect
                    slots={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                                <AccessTimeIcon />
                              </Box>
                            ),
                          }}
                        />
                      ),
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </Stack>
            
            <TextField
              multiline
              rows={2}
              fullWidth
              label="비고"
              placeholder="특이사항이 있으면 입력하세요"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            color="inherit"
            sx={{ 
              borderRadius: 2,
              px: 3
            }}
          >
            취소
          </Button>
          <Button 
            onClick={() => setDeleteDialogOpen(true)}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold'
            }}
          >
            삭제
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            sx={{ 
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold'
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#fef6f6',
          borderBottom: '1px solid rgba(244, 67, 54, 0.1)',
          color: '#d32f2f',
          fontWeight: 'bold'
        }}>
          근무 기록 삭제
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Typography variant="body1" sx={{ mt: 1 }}>
            이 근무 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="inherit"
            sx={{ 
              borderRadius: 2,
              px: 3
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold'
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 중복 시간 확인 다이얼로그 */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={handleDuplicateCancel}
        aria-labelledby="duplicate-dialog-title"
      >
        <DialogTitle id="duplicate-dialog-title" sx={{ fontWeight: 'bold', pb: 1 }}>
          중복된 근무시간 발견
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            선택하신 시간에 이미 다른 근무자의 근무 기록이 있습니다.
          </Typography>
          
          <Box sx={{ 
            mb: 2, 
            p: 2, 
            bgcolor: 'rgba(255, 152, 0, 0.1)', 
            borderRadius: 2,
            border: '1px solid rgba(255, 152, 0, 0.3)'
          }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              중복 근무 기록:
            </Typography>
            
            {duplicateRecords.map((record, index) => (
              <Box key={index} sx={{ mb: index < duplicateRecords.length - 1 ? 1 : 0 }}>
                <Typography variant="body2">
                  {record.employees?.name || '알 수 없음'}: {record.start_time} ~ {record.end_time}
                </Typography>
              </Box>
            ))}
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            그래도 근무 시간을 등록하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDuplicateCancel} color="error">
            취소
          </Button>
          <Button onClick={handleDuplicateConfirm} color="primary">
            등록
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 기본 근무 시간 템플릿 선택 다이얼로그 */}
      <Dialog
        open={defaultScheduleDialogOpen}
        onClose={() => setDefaultScheduleDialogOpen(false)}
        aria-labelledby="default-schedule-dialog-title"
      >
        <DialogTitle id="default-schedule-dialog-title" sx={{ fontWeight: 'bold', pb: 1 }}>
          기본 근무 시간 템플릿 선택
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            아래 템플릿 중 하나를 선택하여 쉽게 근무 시간을 설정하세요.
          </Typography>
          
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {defaultSchedules.map((schedule) => {
              // 근무 시간 계산
              const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
              const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
              
              let hours = endHour - startHour;
              let minutes = endMinute - startMinute;
              
              if (minutes < 0) {
                hours -= 1;
                minutes += 60;
              }
              
              if (hours < 0) {
                hours += 24; // 24시간 형식에서 오버나이트 근무 처리
              }
              
              const totalHours = hours + (minutes / 60);
              
              return (
                <ListItem 
                  key={schedule.id}
                  sx={{ 
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.05)',
                    }
                  }}
                >
                  <ListItemText
                    primary={`${DAY_OF_WEEK_NAMES[schedule.day_of_week]} (${schedule.start_time} ~ ${schedule.end_time})`}
                    secondary={`${totalHours.toFixed(1)}시간`}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="이 템플릿 사용하기">
                      <IconButton 
                        edge="end" 
                        aria-label="use-template"
                        onClick={() => handleUseDefaultSchedule(schedule)}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDefaultScheduleDialogOpen(false)} color="primary">
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TimeKeeper; 