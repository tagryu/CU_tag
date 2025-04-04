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
  DialogActions
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
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
  
  // 수정 관련 상태 추가
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editStartDateTime, setEditStartDateTime] = useState<dayjs.Dayjs | null>(null);
  const [editEndDateTime, setEditEndDateTime] = useState<dayjs.Dayjs | null>(null);
  const [editNotes, setEditNotes] = useState('');
  
  // 삭제 확인 관련 상태 추가
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

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
    }
  }, [employee]);

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
      
      console.log('최근 출석 기록 로드 중... 직원 ID:', employee);
      const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      const endDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
      
      console.log('조회 기간:', startDate, '~', endDate);
      
      // 두 테이블 모두에서 근무 기록 조회 시도
      let records: AttendanceRecord[] = [];
      
      try {
        // 먼저 attendances 테이블에서 조회
        const attendanceRecords = await attendanceService.getAttendanceByEmployee(
          employee,
          startDate,
          endDate
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
          .gte('start_date_time', startDate)
          .lte('end_date_time', endDate);
        
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
        new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
      );
      
      console.log('최종 로드된 출석 기록 (합친 결과):', records);
      setRecentAttendances(records);
    } catch (err) {
      console.error('최근 출석 기록 로드 중 오류:', err);
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

      const result = await attendanceService.addAttendance(attendanceRecord);
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
      console.error('근무 시간 등록 중 오류가 발생했습니다.', err);
      setError(err?.message || '근무 시간 등록 중 오류가 발생했습니다.');
    }
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
        employeeId: editRecord.employeeId,
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

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ 
          borderBottom: '2px solid #1976d2', 
          paddingBottom: 1,
          color: '#1976d2'
        }}>
          근무 시간 등록
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          {isAdmin && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>직원</InputLabel>
              <Select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                label="직원"
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            alignItems: 'stretch',
            mb: 3
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 1, fontWeight: 'bold' }}>시작 시간</Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  value={startDateTime}
                  onChange={(newValue) => setStartDateTime(newValue)}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 1, fontWeight: 'bold' }}>종료 시간</Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  value={endDateTime}
                  onChange={(newValue) => setEndDateTime(newValue)}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Box>
          </Box>
          
          <Box sx={{ 
            mb: 3
          }}>
            <Typography sx={{ mb: 1, fontWeight: 'bold' }}>총 근무 시간</Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 1, 
                textAlign: 'center', 
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '53px'
              }}
            >
              <Typography variant="h6">
                {startDateTime && endDateTime ? 
                  `${((endDateTime.valueOf() - startDateTime.valueOf()) / (1000 * 60 * 60)).toFixed(1)}시간` : 
                  '시간을 선택하세요'
                }
              </Typography>
            </Paper>
          </Box>
          
          <TextField
            fullWidth
            label="비고"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="특이사항이 있으면 입력하세요 (선택사항)"
          />
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            fullWidth
            size="large"
            sx={{ 
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              boxShadow: 3
            }}
          >
            근무 시간 등록
          </Button>
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ 
          borderBottom: '2px solid #1976d2', 
          paddingBottom: 1,
          color: '#1976d2',
          mb: 3
        }}>
          최근 근무 기록
        </Typography>
        
        {recentAttendances.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center', 
            backgroundColor: '#f9f9f9',
            borderRadius: 2
          }}>
            <Typography variant="subtitle1" color="text.secondary">최근 근무 기록이 없습니다.</Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {recentAttendances.map((record) => (
              <Paper 
                key={record.id} 
                sx={{ 
                  p: 3, 
                  mb: 2, 
                  bgcolor: '#e8f5e9',
                  borderLeft: '5px solid #4caf50',
                  borderRadius: 2,
                  boxShadow: 2
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                      {dayjs(record.startDateTime).format('YYYY년 MM월 DD일')}
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1, sm: 2 },
                      mb: 1
                    }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        시간: {dayjs(record.startDateTime).format('HH:mm')} - {dayjs(record.endDateTime).format('HH:mm')}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: '#1976d2'
                        }}
                      >
                        {(
                          (new Date(record.endDateTime).getTime() - 
                          new Date(record.startDateTime).getTime()) / 
                          (1000 * 60 * 60)
                        ).toFixed(1)}시간
                      </Typography>
                    </Box>
                    
                    {record.notes && (
                      <Typography variant="body2" sx={{ 
                        mt: 1,
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        bgcolor: 'rgba(0,0,0,0.05)',
                        p: 1,
                        borderRadius: 1
                      }}>
                        {record.notes}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'row', sm: 'column' }, 
                    gap: 1 
                  }}>
                    <Button 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      onClick={() => handleEditClick(record)}
                      startIcon={<span>✎</span>}
                      sx={{ 
                        minWidth: '70px',
                        borderRadius: 2
                      }}
                    >
                      수정
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      onClick={() => handleDeleteClick(record.id || '')}
                      startIcon={<span>✖</span>}
                      sx={{ 
                        minWidth: '70px',
                        borderRadius: 2
                      }}
                    >
                      삭제
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
      
      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0',
          fontWeight: 'bold',
          bgcolor: '#f5f5f5'
        }}>
          근무 기록 수정
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: 2, 
              mb: 3 
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ mb: 1, fontWeight: 'bold' }}>시작 시간</Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={editStartDateTime}
                    onChange={(newValue) => setEditStartDateTime(newValue)}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ mb: 1, fontWeight: 'bold' }}>종료 시간</Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={editEndDateTime}
                    onChange={(newValue) => setEditEndDateTime(newValue)}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ mb: 1, fontWeight: 'bold' }}>총 근무 시간</Typography>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 1.5, 
                  textAlign: 'center', 
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1
                }}
              >
                <Typography variant="h6">
                  {editStartDateTime && editEndDateTime ? 
                    `${((editEndDateTime.valueOf() - editStartDateTime.valueOf()) / (1000 * 60 * 60)).toFixed(1)}시간` : 
                    '시간을 선택하세요'
                  }
                </Typography>
              </Paper>
            </Box>
            
            <TextField
              fullWidth
              label="비고"
              multiline
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="특이사항이 있으면 입력하세요 (선택사항)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
          >
            취소
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            sx={{ minWidth: '100px' }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ 
          color: '#f44336',
          fontWeight: 'bold',
          borderBottom: '1px solid #ffccbc'
        }}>
          근무 기록 삭제
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography sx={{ mb: 2 }}>정말로 이 근무 기록을 삭제하시겠습니까?</Typography>
          <Typography variant="caption" color="error" sx={{ 
            display: 'block',
            p: 1, 
            bgcolor: '#ffebee',
            borderRadius: 1
          }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            취소
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            sx={{ minWidth: '100px' }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TimeKeeper; 