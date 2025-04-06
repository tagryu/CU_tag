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
  Tooltip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord, DefaultSchedule, DAY_OF_WEEK_NAMES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import 'dayjs/locale/ko';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EventNoteIcon from '@mui/icons-material/EventNote';
// Grid 임포트는 현재 사용되지 않으므로 주석 처리
// import Grid from '../components/GridFix';
// 일반 임포트 대신 명명된 임포트 사용

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
      
      // 두 테이블 모두에서 근무 기록 조회 시도
      let records: AttendanceRecord[] = [];
      
      try {
        // 먼저 attendances 테이블에서 조회
        const attendanceRecords = await attendanceService.getAttendanceByEmployee(
          employee,
          todayStart,
          todayEnd
        );
        
        console.log('attendances 테이블에서 조회된 기록:', attendanceRecords);
        records = [...attendanceRecords];
      } catch (err) {
        console.error('attendances 테이블 조회 중 오류:', err);
      }
      
      try {
        // attendance_records 테이블에서도 추가 조회
        const { supabase } = await import('../services/supabase');
        
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', employee)
          .gte('start_date_time', todayStart)
          .lte('end_date_time', todayEnd);
        
        if (error) {
          console.error('attendance_records 테이블 조회 중 오류:', error);
        } else if (data && data.length > 0) {
          console.log('attendance_records 테이블에서 조회된 기록:', data);
          
          // 형식 변환하여 추가
          const convertedRecords: AttendanceRecord[] = data.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            startDateTime: record.start_date_time,
            endDateTime: record.end_date_time,
            notes: record.notes || ''
          }));
          
          records = [...records, ...convertedRecords];
        }
      } catch (err) {
        console.error('attendance_records 테이블 조회 중 오류:', err);
      }
      
      // 날짜 순으로 정렬
      records.sort((a, b) => 
        new Date(b.startDateTime || '').getTime() - new Date(a.startDateTime || '').getTime()
      );
      
      console.log('최종 로드된 출석 기록 (합친 결과):', records);
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

      // 시작 시간이 종료 시간보다 늦은 경우를 체크합니다
      if (startDateTime.isAfter(endDateTime)) {
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
      console.log('변환된 시작 시간 문자열:', startDateTimeStr);
      console.log('변환된 종료 시간 문자열:', endDateTimeStr);

      const attendanceRecord = {
        employeeId: employee,
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        notes: notes || ''
      };
      
      console.log('전송할 근무 기록:', attendanceRecord);

      // 중복 근무 시간 확인
      try {
        const dateStr = startDateTime.format('YYYY-MM-DD');
        const { supabase } = await import('../services/supabase');
        
        // attendances 테이블에서 해당 날짜에 등록된 모든 근무 기록 조회
        const { data, error } = await supabase
          .from('attendances')
          .select('*, employees(name)')
          .eq('date', dateStr);
          
        if (error) {
          console.error('근무 기록 중복 확인 중 오류:', error);
        } else if (data && data.length > 0) {
          console.log('해당 날짜의 모든 근무 기록:', data);
          
          // 현재 선택한 시간과 겹치는 기록 확인
          const overlappingRecords = data.filter((record: any) => {
            const recordStartTime = `${dateStr}T${record.start_time}`;
            const recordEndTime = `${dateStr}T${record.end_time}`;
            
            // 시간 겹침 확인 로직
            const isOverlapping = (
              (startDateTimeStr <= recordEndTime && endDateTimeStr >= recordStartTime) ||
              (recordStartTime <= endDateTimeStr && recordEndTime >= startDateTimeStr)
            );
            
            return isOverlapping;
          });
          
          if (overlappingRecords.length > 0) {
            console.log('겹치는 근무 기록 발견:', overlappingRecords);
            
            // 겹치는 기록 정보 가공하여 저장
            const formattedRecords = overlappingRecords.map((record: any) => ({
              employeeName: record.employees?.name || '알 수 없음',
              startTime: record.start_time,
              endTime: record.end_time
            }));
            
            // 중복 기록 상태 업데이트
            setDuplicateRecords(formattedRecords);
            setPendingRecord(attendanceRecord);
            setDuplicateDialogOpen(true);
            return; // 여기서 중단하고 다이얼로그 표시
          }
        }
      } catch (err) {
        console.error('중복 근무 시간 확인 중 오류:', err);
        // 중복 확인 실패 시에도 계속 진행 (오류 방지)
      }

      // 중복이 없으면 그대로 진행
      await saveAttendanceRecord(attendanceRecord);
    } catch (err: any) {
      console.error('근무 시간 등록 중 오류가 발생했습니다.', err);
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

  // 수정 버튼 클릭 핸들러
  const handleEditClick = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditStartDateTime(dayjs(record.startDateTime));
    setEditEndDateTime(dayjs(record.endDateTime));
    setEditNotes(record.notes || '');
    setEditDialogOpen(true);
  };
  
  // 수정 내용 저장 핸들러
  const handleEditSave = async () => {
    try {
      if (!editRecord || !editStartDateTime || !editEndDateTime) {
        setError('필수 정보가 누락되었습니다.');
        return;
      }
      
      if (editStartDateTime.isAfter(editEndDateTime)) {
        setError('종료 시간은 시작 시간 이후로 설정해주세요.');
        return;
      }
      
      // 현재 선택된 시작 시간과 종료 시간을 정확히 보존
      const startDateTimeStr = editStartDateTime.format('YYYY-MM-DDTHH:mm:00');
      const endDateTimeStr = editEndDateTime.format('YYYY-MM-DDTHH:mm:00');
      
      // 시간대 확인 로깅
      console.log('수정된 시작 시간:', editStartDateTime.format('YYYY-MM-DD HH:mm'));
      console.log('수정된 종료 시간:', editEndDateTime.format('YYYY-MM-DD HH:mm'));
      console.log('변환된 시작 시간 문자열:', startDateTimeStr);
      console.log('변환된 종료 시간 문자열:', endDateTimeStr);
      
      const updatedRecord = {
        employeeId: editRecord.employeeId || '',
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        notes: editNotes || ''
      };
      
      console.log('수정할 근무 기록:', updatedRecord);
      
      await attendanceService.updateAttendance(editRecord.id || '', updatedRecord);
      
      setSuccess('근무 기록이 성공적으로 수정되었습니다.');
      setEditDialogOpen(false);
      loadRecentAttendances();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('근무 기록 수정 중 오류:', err);
      setError(err?.message || '근무 기록 수정 중 오류가 발생했습니다.');
    }
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

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* 근무 시간 등록 폼 */}
      <Card 
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* 상단 제목 영역 */}
          <Box sx={{ 
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <Typography 
              variant="h5" 
              fontWeight="bold"
              color="primary"
              sx={{ mb: 1 }}
            >
              근무 시간 등록
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' },
                opacity: 0.8 
              }}
            >
              {todayDate}
            </Typography>
          </Box>
          
          {/* 알림 메시지 */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                fontSize: '0.9rem'
              }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                fontSize: '0.9rem'
              }}
            >
              {success}
            </Alert>
          )}
          
          {/* 직원 선택 (관리자만) */}
          {isAdmin && (
            <FormControl 
              fullWidth 
              variant="outlined" 
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            >
              <InputLabel id="role-label">직원 선택</InputLabel>
              <Select
                labelId="role-label"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                label="직원 선택"
                sx={{ 
                  fontSize: '0.95rem',
                  fontWeight: 'medium'
                }}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name || emp.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {/* 기본 근무 시간 템플릿 버튼 */}
          {defaultSchedules.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<EventNoteIcon />}
                onClick={handleOpenDefaultScheduleDialog}
                size="medium"
                sx={{ borderRadius: 2 }}
              >
                기본 근무 시간 템플릿 사용하기
              </Button>
            </Box>
          )}
          
          {/* 시간 선택 영역 */}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <Stack 
              spacing={3}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            >
              {/* 시작 시간 */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column' 
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 'bold',
                    color: 'text.primary'
                  }}
                >
                  시작 시간
                </Typography>
                <DateTimePicker
                  value={startDateTime}
                  onChange={(newValue) => setStartDateTime(newValue)}
                  ampm={false}
                  sx={{
                    backgroundColor: '#f8f9fa',
                    '& .MuiInputBase-root': {
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </Box>
              
              {/* 종료 시간 */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column' 
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 'bold',
                    color: 'text.primary'
                  }}
                >
                  종료 시간
                </Typography>
                <DateTimePicker
                  value={endDateTime}
                  onChange={(newValue) => setEndDateTime(newValue)}
                  ampm={false}
                  sx={{
                    backgroundColor: '#f8f9fa',
                    '& .MuiInputBase-root': {
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </Box>
              
              {/* 총 근무 시간 표시 */}
              {totalHours !== null && (
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(25, 118, 210, 0.05)',
                  borderRadius: 2,
                  p: 2
                }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      color: 'text.primary'
                    }}
                  >
                    총 근무 시간
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 'bold'
                    }}
                  >
                    {totalHours.toFixed(1)}시간
                  </Typography>
                </Box>
              )}
              
              {/* 메모 (선택) */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column' 
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 'bold',
                    color: 'text.primary'
                  }}
                >
                  메모 (선택)
                </Typography>
                <TextField
                  multiline
                  rows={2}
                  placeholder="특이사항 등을 기록하세요"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{
                    backgroundColor: '#f8f9fa',
                    '& .MuiInputBase-root': {
                      fontSize: '0.95rem',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            </Stack>
          </LocalizationProvider>
          
          {/* 등록 버튼 */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSubmit}
            sx={{ 
              py: 1.5, 
              borderRadius: 2,
              fontWeight: 'bold' 
            }}
          >
            근무 시간 등록
          </Button>
        </CardContent>
      </Card>
      
      {/* 오늘 근무 기록 */}
      {employee && (
        <Card 
          elevation={0}
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ 
            p: { xs: 2, sm: 3 },
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{ color: 'text.primary' }}
            >
              오늘 근무 기록
            </Typography>
          </Box>
          
          {recentAttendances.length === 0 ? (
            <Box 
              sx={{ 
                py: 4, 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa'
              }}
            >
              <Box sx={{ 
                width: 60, 
                height: 60, 
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="h4" sx={{ opacity: 0.3 }}>
                  ?
                </Typography>
              </Box>
              <Typography 
                variant="body1" 
                sx={{ 
                  textAlign: 'center',
                  color: 'text.secondary',
                  px: 2
                }}
              >
                오늘 등록된 근무 기록이 없습니다
              </Typography>
            </Box>
          ) : (
            <Box>
              {recentAttendances.map((record, index) => {
                // 날짜 포맷팅
                const startTime = dayjs(record.startDateTime).format('HH:mm');
                const endTime = dayjs(record.endDateTime).format('HH:mm');
                
                // 총 근무 시간 계산
                const start = dayjs(record.startDateTime);
                const end = dayjs(record.endDateTime);
                const hours = end.diff(start, 'hour', true);
                
                // 상태 표시 (8시간 초과, 정상, 4시간 미만)
                let statusColor = '#4caf50'; // 기본 정상(녹색)
                let statusText = '정상';
                
                if (hours > 8) {
                  statusColor = '#1976d2'; // 초과(파란색)
                  statusText = '초과';
                } else if (hours < 4) {
                  statusColor = '#f44336'; // 미만(빨간색)
                  statusText = '단시간';
                }
                
                return (
                  <Box key={record.id || index}>
                    {index > 0 && <Divider />}
                    <Box sx={{ 
                      p: { xs: 2, sm: 3 },
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.02)'
                      }
                    }}>
                      <Box sx={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1
                      }}>
                        {/* 시간 표시 */}
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.95rem'
                          }}
                        >
                          {startTime} - {endTime}
                        </Typography>
                        
                        {/* 상태 표시 */}
                        <Box sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 5,
                          backgroundColor: `${statusColor}20`,
                          border: `1px solid ${statusColor}40`
                        }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: statusColor,
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          >
                            {statusText}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 근무 시간 */}
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: statusColor,
                          mb: 1
                        }}
                      >
                        {hours.toFixed(1)}시간
                      </Typography>
                      
                      {/* 비고 */}
                      {record.notes && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            mb: 2,
                            fontStyle: 'italic',
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: 'rgba(0,0,0,0.03)'
                          }}
                        >
                          {record.notes}
                        </Typography>
                      )}
                      
                      {/* 수정/삭제 버튼 */}
                      <Box sx={{ 
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1
                      }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleEditClick(record)}
                          sx={{ 
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            px: 2
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteClick(record.id!)}
                          sx={{ 
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            px: 2
                          }}
                        >
                          삭제
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Card>
      )}
      
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
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <Stack spacing={3}>
              <DateTimePicker
                label="시작 시간"
                value={editStartDateTime}
                onChange={(newValue) => setEditStartDateTime(newValue)}
                ampm={false}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <DateTimePicker
                label="종료 시간"
                value={editEndDateTime}
                onChange={(newValue) => setEditEndDateTime(newValue)}
                ampm={false}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
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
          </LocalizationProvider>
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
            onClick={handleEditSave}
            variant="contained"
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
                  {record.employeeName}: {record.startTime} ~ {record.endTime}
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