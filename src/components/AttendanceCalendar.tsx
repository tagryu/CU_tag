import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material';
import { Grid } from '../components/GridFix';
import { styled } from '@mui/material/styles';
import { attendanceService } from '../services/attendanceService';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { User, Attendance } from '../types';

// 한국어 로케일 설정
dayjs.locale('ko');

// 스타일이 적용된 달력 날짜 박스
const DateBox = styled(Paper)(({ theme }) => ({
  height: '120px',
  padding: theme.spacing(1),
  textAlign: 'center',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease-in-out',
  border: '1px solid #e0e0e0',
  backgroundColor: theme.palette.background.paper,
  boxShadow: 'rgba(9, 30, 66, 0.05) 0px 1px 1px, rgba(9, 30, 66, 0.1) 0px 0px 1px 1px',
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.light,
  }
}));

// 오늘 날짜 스타일
const TodayBox = styled(DateBox)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.common.white,
  border: `2px solid ${theme.palette.primary.main}`,
  boxShadow: theme.shadows[2],
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  }
}));

// 빈 날짜 박스
const EmptyBox = styled(Box)(({ theme }) => ({
  height: '120px',
  padding: theme.spacing(1),
  textAlign: 'center',
  backgroundColor: theme.palette.grey[50],
  opacity: 0.5,
  borderRadius: theme.shape.borderRadius,
}));

// 근무자 배지 스타일
const EmployeeBadge = styled(Chip)(({ theme }) => ({
  margin: '2px',
  fontSize: '0.7rem',
  height: '22px',
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

const AttendanceCalendar = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [calendarDays, setCalendarDays] = useState<dayjs.Dayjs[][]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dayAttendances, setDayAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 달력 데이터 생성
  useEffect(() => {
    const firstDayOfMonth = currentDate.startOf('month');
    const firstDayOfCalendar = firstDayOfMonth.startOf('week');
    
    const days: dayjs.Dayjs[][] = [];
    let week: dayjs.Dayjs[] = [];
    
    for (let i = 0; i < 42; i++) {
      const day = firstDayOfCalendar.add(i, 'day');
      
      if (i % 7 === 0 && i > 0) {
        days.push(week);
        week = [];
      }
      
      week.push(day);
      
      if (i === 41) {
        days.push(week);
      }
    }
    
    setCalendarDays(days);
  }, [currentDate]);

  // 직원 이름 데이터 가져오기
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        console.log('직원 목록 가져오기 시작');
        const employees = await attendanceService.getEmployees();
        console.log('가져온 직원 목록:', employees);
        
        const namesMap: Record<string, string> = {};
        
        employees.forEach(emp => {
          console.log('직원 정보:', emp);
          namesMap[emp.id] = emp.name || '이름 없음';
        });
        
        console.log('생성된 이름 맵:', namesMap);
        setEmployeeNames(namesMap);
        setError(null);
      } catch (error) {
        console.error('직원 목록 가져오기 실패:', error);
        setError('직원 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // 해당 월의 출근 데이터 가져오기
  useEffect(() => {
    const fetchMonthlyAttendance = async () => {
      try {
        setLoading(true);
        const year = currentDate.year();
        const month = currentDate.month() + 1;
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        
        const attendances = await attendanceService.getAttendanceByMonth(monthStr);
        
        // 날짜별로 데이터 그룹화
        const groupedData: Record<string, any[]> = {};
        
        attendances.forEach((record: any) => {
          // 데이터 구조에 따라 날짜 정보 추출
          const dateKey = record.date || dayjs(record.startDateTime || record.startTime || new Date()).format('YYYY-MM-DD');
          
          if (!groupedData[dateKey]) {
            groupedData[dateKey] = [];
          }
          
          groupedData[dateKey].push(record);
        });
        
        setAttendanceData(groupedData);
        setError(null);
      } catch (error) {
        console.error('출근 데이터 가져오기 실패:', error);
        setError('근무 기록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMonthlyAttendance();
  }, [currentDate]);

  // 이전 달 이동
  const goToPrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  // 다음 달 이동
  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  // 날짜 클릭 처리
  const handleDateClick = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
    setLoadingDetails(true);
    
    // 해당 날짜의 출근 데이터 확인
    const dateStr = date.format('YYYY-MM-DD');
    const dayData = attendanceData[dateStr] || [];
    
    // 잠시 딜레이를 줘서 로딩 상태를 보여줌
    setTimeout(() => {
      setDayAttendances(dayData);
      setDialogOpen(true);
      setLoadingDetails(false);
    }, 300);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // 현재 날짜 맞춤
  const isToday = (date: dayjs.Dayjs) => {
    return date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
  };

  // 현재 달에 속한 날짜인지 확인
  const isCurrentMonth = (date: dayjs.Dayjs) => {
    return date.month() === currentDate.month();
  };

  // 해당 날짜의 근무자 배지 렌더링
  const renderEmployeeBadges = (day: dayjs.Dayjs) => {
    const dateStr = day.format('YYYY-MM-DD');
    const recordsForDay = attendanceData[dateStr] || [];

    // 중복 제거를 위해 set 사용
    const employeeIds = new Set<string>();
    recordsForDay.forEach((record: any) => {
      const employeeId = record.employee_id || record.employeeId;
      if (employeeId) {
        employeeIds.add(employeeId);
      }
    });

    // 최대 3명까지만 표시하고 나머지는 +N으로 표시
    const maxDisplay = 3;
    const idArray = Array.from(employeeIds);
    const displayCount = Math.min(maxDisplay, idArray.length);
    const remainingCount = idArray.length - displayCount;

    // 근무자가 없는 경우
    if (idArray.length === 0) {
      return null;
    }

    return (
      <Box sx={{ 
        mt: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          width: '100%', 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          gap: 0.5
        }}>
          {idArray.slice(0, displayCount).map(id => {
            const name = employeeNames[id] || id;
            // 이름이 길면 짧게 줄임
            const displayName = name.length > 5 ? `${name.substring(0, 4)}..` : name;
            
            return (
              <EmployeeBadge
                key={id}
                label={displayName}
                size="small"
              />
            );
          })}
          
          {remainingCount > 0 && (
            <EmployeeBadge
              label={`+${remainingCount}명`}
              size="small"
              sx={{ 
                bgcolor: 'grey.500',
                '&:hover': {
                  bgcolor: 'grey.600',
                }
              }}
            />
          )}
        </Box>
        
        {idArray.length > 0 && (
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 0.5, 
              fontSize: '0.7rem',
              color: 'text.secondary',
              bgcolor: 'rgba(0,0,0,0.03)',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontWeight: 'medium',
            }}
          >
            총 {idArray.length}명 근무
          </Typography>
        )}
      </Box>
    );
  };

  // 달력 일자 렌더링
  const renderDay = (day: dayjs.Dayjs) => {
    const isCurrentMonthDay = isCurrentMonth(day);
    const isTodayDate = isToday(day);
    const dateStr = day.format('YYYY-MM-DD');
    const hasAttendance = attendanceData[dateStr] && attendanceData[dateStr].length > 0;
    
    // 현재 달에 속하지 않는 날짜는 흐리게 표시
    if (!isCurrentMonthDay) {
      return <EmptyBox key={day.format('YYYY-MM-DD')}>{day.date()}</EmptyBox>;
    }
    
    // 오늘 날짜인 경우 강조 표시
    const DayComponent = isTodayDate ? TodayBox : DateBox;
    
    return (
      <DayComponent 
        key={day.format('YYYY-MM-DD')} 
        onClick={() => handleDateClick(day)}
        elevation={hasAttendance ? 2 : 0}
        sx={hasAttendance ? {
          // 근무 기록이 있는 날짜는 테두리 강조
          borderLeft: '3px solid #1976d2',
        } : {}}
      >
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            color: isTodayDate ? 'white' :
                   day.day() === 0 ? 'error.main' : 
                   day.day() === 6 ? 'primary.main' : 'inherit'
          }}
        >
          {day.date()}
        </Typography>
        {renderEmployeeBadges(day)}
      </DayComponent>
    );
  };

  // 로딩 중일 때의 표시
  if (loading && !Object.keys(attendanceData).length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">달력 정보를 불러오는 중...</Typography>
      </Box>
    );
  }

  // 오류 발생 시의 표시
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ fontWeight: 'bold' }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        borderBottom: '2px solid #1976d2',
        paddingBottom: 2
      }}>
        <Button 
          onClick={goToPrevMonth}
          variant="outlined"
          size="small"
          sx={{ 
            borderRadius: 2,
            fontWeight: 'bold'
          }}
          disabled={loading}
        >
          {'< 이전 달'}
        </Button>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            color: '#1976d2'
          }}
        >
          {currentDate.format('YYYY년 MM월')}
          {loading && <CircularProgress size={20} sx={{ ml: 1, verticalAlign: 'middle' }} />}
        </Typography>
        <Button 
          onClick={goToNextMonth}
          variant="outlined"
          size="small"
          sx={{ 
            borderRadius: 2,
            fontWeight: 'bold'
          }}
          disabled={loading}
        >
          {'다음 달 >'}
        </Button>
      </Box>
      
      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid container item spacing={1}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <Grid item xs={12/7} key={index}>
              <Typography 
                align="center" 
                sx={{ 
                  fontWeight: 'bold',
                  py: 1,
                  backgroundColor: index === 0 ? '#ffebee' : 
                                   index === 6 ? '#e3f2fd' : '#f5f5f5',
                  color: index === 0 ? 'error.main' : 
                         index === 6 ? 'primary.main' : 'inherit',
                  borderRadius: 1
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {calendarDays.map((week, weekIndex) => (
          <Grid container item spacing={1} key={weekIndex}>
            {week.map((day, dayIndex) => (
              <Grid item xs={12/7} key={dayIndex}>
                {renderDay(day)}
              </Grid>
            ))}
          </Grid>
        ))}
      </Grid>
      
      {/* 근무 상세 조회 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0',
          bgcolor: '#f5f5f5',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            {selectedDate?.format('YYYY년 MM월 DD일')} 근무 기록
            {loadingDetails && <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />}
          </Box>
          <IconButton 
            size="small" 
            onClick={handleCloseDialog}
            sx={{ 
              bgcolor: 'rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
            }}
          >
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingDetails ? (
            <Box sx={{ p: 2 }}>
              {[...Array(3)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="30%" height={40} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={60} />
                </Box>
              ))}
            </Box>
          ) : dayAttendances.length === 0 ? (
            <Box sx={{ 
              p: 4, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: '#f9f9f9',
              minHeight: '200px'
            }}>
              <Typography 
                variant="body1" 
                sx={{ color: 'text.secondary' }}
              >
                이 날짜에는 등록된 근무 기록이 없습니다.
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {dayAttendances.map((record: any, index: number) => {
                // 직원 ID로 이름 찾기
                const empId = record.employee_id || record.employeeId;
                
                // employees 테이블의 name 필드 또는 employeeNames 매핑 사용
                let empName = record.name || record.employee_name || employeeNames[empId] || empId;
                
                // 혹시 중첩된 데이터 구조인 경우 처리
                if (record.employees && record.employees.name) {
                  empName = record.employees.name;
                }
                
                // 시작 시간과 종료 시간 추출
                let startTime = '08:00';
                let endTime = '17:00';
                
                if (record.start_time) {
                  startTime = record.start_time.substring(0, 5); // HH:MM 형식으로 변환
                } else if (record.startDateTime) {
                  startTime = dayjs(record.startDateTime).format('HH:mm');
                } else if (record.startTime) {
                  startTime = record.startTime.substring(0, 5);
                }
                
                if (record.end_time) {
                  endTime = record.end_time.substring(0, 5); // HH:MM 형식으로 변환
                } else if (record.endDateTime) {
                  endTime = dayjs(record.endDateTime).format('HH:mm');
                } else if (record.endTime) {
                  endTime = record.endTime.substring(0, 5);
                }
                
                // 근무 시간 계산
                let hours = 8; // 기본값
                if (record.total_hours) {
                  hours = record.total_hours;
                } else if (record.startDateTime && record.endDateTime) {
                  const start = new Date(record.startDateTime);
                  const end = new Date(record.endDateTime);
                  hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                }
                
                return (
                  <React.Fragment key={record.id || index}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ 
                      px: 3, 
                      py: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      bgcolor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.01)' : 'transparent'
                    }}>
                      <Box sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ fontWeight: 'bold' }}
                        >
                          {empName}
                        </Typography>
                      </Box>
                      
                      <Box sx={{
                        width: '100%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          my: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'rgba(0,0,0,0.03)'
                        }}>
                          <Typography variant="body1" sx={{ mr: 2 }}>
                            ⏰ {startTime} - {endTime}
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: hours > 8 ? '#1976d2' : hours < 4 ? '#f44336' : '#4caf50'
                            }}
                          >
                            {hours.toFixed(1)}시간
                          </Typography>
                        </Box>
                      </Box>
                      
                      {record.notes && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 1, 
                            fontStyle: 'italic',
                            color: 'text.secondary' 
                          }}
                        >
                          {record.notes}
                        </Typography>
                      )}
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid #e0e0e0',
          p: 2,
          justifyContent: 'center'
        }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="contained"
            sx={{ 
              minWidth: '120px',
              fontWeight: 'bold',
              borderRadius: 2
            }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceCalendar; 