import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord } from '../types';
import Grid from './GridFix';
import dayjs from 'dayjs';

interface AttendanceFormProps {
  employeeId: string;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ employeeId }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);

  // 근태 기록 추가
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !startTime || !endTime) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    // 시작 시간이 종료 시간보다 늦은 경우
    if (startTime >= endTime) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // 날짜와 시간 합치기
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;
      
      await attendanceService.addAttendance({
        employeeId,
        startDateTime,
        endDateTime,
        notes: ''
      });
      
      // 성공 후 폼 초기화
      setStartTime('');
      setEndTime('');
      setSuccess(true);
      
      // 최근 근태 기록 갱신
      const startOfMonth = dayjs().startOf('month').toISOString();
      const endOfMonth = dayjs().endOf('month').toISOString();
      const attendances = await attendanceService.getAttendanceByEmployee(
        employeeId, 
        startOfMonth, 
        endOfMonth
      );
      setRecentAttendances(attendances.slice(0, 5)); // 최근 5개만 표시
    } catch (err: any) {
      console.error('근태 등록 오류:', err);
      setError(err.message || '근태 기록 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 컴포넌트 마운트 시 최근 근태 기록 로드
  React.useEffect(() => {
    const fetchRecentAttendances = async () => {
      try {
        const startOfMonth = dayjs().startOf('month').toISOString();
        const endOfMonth = dayjs().endOf('month').toISOString();
        const attendances = await attendanceService.getAttendanceByEmployee(
          employeeId, 
          startOfMonth, 
          endOfMonth
        );
        setRecentAttendances(attendances.slice(0, 5)); // 최근 5개 기록만 표시
      } catch (err) {
        console.error('최근 근태 기록 로드 오류:', err);
      }
    };
    
    if (employeeId) {
      fetchRecentAttendances();
    }
  }, [employeeId]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            근무 시간 등록
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              근태 기록이 성공적으로 등록되었습니다.
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="date"
                  label="근무 일자"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  id="startTime"
                  label="시작 시간"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }} // 5분 단위
                  disabled={loading}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  id="endTime"
                  label="종료 시간"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }} // 5분 단위
                  disabled={loading}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? '등록 중...' : '근무 시간 등록'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            최근 근무 기록
          </Typography>
          
          {recentAttendances.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              최근 근무 기록이 없습니다.
            </Typography>
          ) : (
            <Box>
              {recentAttendances.map((attendance) => (
                <Box 
                  key={attendance.id} 
                  sx={{ 
                    mb: 1, 
                    p: 2, 
                    border: '1px solid #eee', 
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                >
                  <Grid container spacing={1}>
                    <Grid item xs={5}>
                      <Typography variant="body2" fontWeight="bold">
                        {dayjs(attendance.startDateTime).format('YYYY-MM-DD')}
                      </Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <Typography variant="body2">
                        {dayjs(attendance.startDateTime).format('HH:mm')} - {dayjs(attendance.endDateTime).format('HH:mm')}
                      </Typography>
                    </Grid>
                    <Grid item xs={2}>
                      <Typography variant="body2" align="right">
                        {((new Date(attendance.endDateTime).getTime() - 
                          new Date(attendance.startDateTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}시간
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AttendanceForm; 