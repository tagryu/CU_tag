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
  height: 'auto',
  aspectRatio: '1',
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
  backgroundColor: '#e3f2fd',
  color: theme.palette.common.black,
  border: `2px solid #1976d2`,
  boxShadow: theme.shadows[2],
  position: 'relative',
  '&::after': {
    content: '"오늘"',
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#1976d2',
    color: 'white',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '0.6rem',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  '&:hover': {
    backgroundColor: '#bbdefb',
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  }
}));

// 빈 날짜 박스
const EmptyBox = styled(Box)(({ theme }) => ({
  height: 'auto',
  aspectRatio: '1',
  padding: theme.spacing(1),
  textAlign: 'center',
  backgroundColor: theme.palette.grey[50],
  opacity: 0.5,
  borderRadius: theme.shape.borderRadius,
}));

// 근무자 배지 스타일
const EmployeeBadge = styled(Chip)(({ theme }) => ({
  margin: '1px',
  fontSize: '0.65rem',
  height: '18px',
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.common.white,
  fontWeight: 'bold',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
}));

// 이벤트 스타일을 위한 인터페이스 정의
interface EventItemProps {
  bgcolor?: string;
}

// 이벤트 스타일
const EventItem = styled(Box)<EventItemProps>(({ theme, bgcolor = '#4285F4' }) => ({
  padding: '2px 4px',
  borderRadius: '4px',
  marginBottom: '2px',
  fontSize: '0.7rem',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: bgcolor,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  '&:hover': {
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    opacity: 0.9
  }
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

    // 구성된 이벤트 목록
    const events: {id: string, name: string, color: string}[] = [];
    
    // 모든 직원 기록을 이벤트 스타일로 구성
    Array.from(employeeIds).forEach((id, index) => {
      const name = employeeNames[id] || id;
      // 다양한 색상 사용
      const colors = ['#4285F4', '#0F9D58', '#DB4437', '#F4B400', '#8833FF'];
      events.push({
        id,
        name,
        color: colors[index % colors.length]
      });
    });

    // 화면 크기에 따라 표시할 최대 이벤트 수 조정
    const maxDisplay = { xs: 2, sm: 3, md: 4 };
    const maxDisplayCount = window.innerWidth < 600 ? maxDisplay.xs : 
                             window.innerWidth < 960 ? maxDisplay.sm : maxDisplay.md;
    
    // 이벤트가 많을 때 나머지를 +N 형태로 표시하는 로직
    const displayEvents = events.slice(0, maxDisplayCount);
    const remainingCount = events.length - maxDisplayCount;

    // 구글 캘린더 스타일 이벤트 표시
    return (
      <Box sx={{ 
        mt: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        width: '100%'
      }}>
        {displayEvents.map(event => (
          <EventItem 
            key={event.id}
            bgcolor={event.color}
            title={event.name}
            onClick={(e) => {
              e.stopPropagation();
              handleDateClick(day);
            }}
            sx={{
              fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
              py: { xs: 1, sm: 2 }
            }}
          >
            {event.name.length > 6 ? `${event.name.substring(0, 5)}..` : event.name}
          </EventItem>
        ))}
        {remainingCount > 0 && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.65rem',
              color: 'text.secondary',
              mt: 0.5,
              fontWeight: 'bold',
              bgcolor: 'rgba(0,0,0,0.05)',
              px: 1,
              py: 0.5,
              borderRadius: 1
            }}
          >
            +{remainingCount}명
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
    
    // 주말 여부 확인 
    const isWeekend = day.day() === 0 || day.day() === 6;
    
    return (
      <DayComponent 
        key={day.format('YYYY-MM-DD')} 
        onClick={() => handleDateClick(day)}
        elevation={hasAttendance ? 2 : 0}
        sx={{
          borderLeft: isWeekend && !isTodayDate ? 
            (day.day() === 0 ? '3px solid #f44336' : '3px solid #1976d2') : undefined,
          position: 'relative',
          height: { xs: '80px', sm: '100px', md: '110px' }, // 모바일에서는 더 작게
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: { xs: '24px', sm: '28px' },
          height: { xs: '24px', sm: '28px' },
          margin: '0 0 2px 0',
          borderRadius: '50%',
          backgroundColor: isWeekend && !isTodayDate ? 
            (day.day() === 0 ? '#ffebee' : '#e3f2fd') : 
            'transparent',
          position: 'absolute',
          top: '2px',
          left: '2px'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: isTodayDate ? 'bold' : 'medium',
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              color: isTodayDate ? '#1976d2' :
                    day.day() === 0 ? '#f44336' : 
                    day.day() === 6 ? '#1976d2' : 'inherit'
            }}
          >
            {day.date()}
          </Typography>
        </Box>
        
        <Box sx={{ pt: { xs: 3.5, sm: 4.5 }, width: '100%' }}>
          {renderEmployeeBadges(day)}
        </Box>
      </DayComponent>
    );
  };

  // iOS 스타일 달력용 근무자 배지 렌더링
  const renderIOSStyleBadges = (day: dayjs.Dayjs) => {
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

    // 구성된 이벤트 목록
    const events: {id: string, name: string, color: string}[] = [];
    
    // 모든 직원 기록을 이벤트 스타일로 구성
    Array.from(employeeIds).forEach((id, index) => {
      const name = employeeNames[id] || id;
      // 다양한 색상 사용
      const colors = ['#4285F4', '#0F9D58', '#DB4437', '#F4B400', '#8833FF'];
      events.push({
        id,
        name,
        color: colors[index % colors.length]
      });
    });

    // 모바일에서는 최대 2개만 표시
    const maxDisplayCount = 2;
    const displayEvents = events.slice(0, maxDisplayCount);
    const remainingCount = events.length - maxDisplayCount;

    return (
      <>
        {displayEvents.map(event => (
          <Box 
            key={event.id}
            sx={{
              width: '90%',
              mb: 0.25,
              py: 0.25,
              px: 0.5,
              borderRadius: '10px',
              backgroundColor: event.color,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Typography sx={{
              fontSize: '0.6rem',
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {event.name.length > 3 ? `${event.name.substring(0, 2)}..` : event.name}
            </Typography>
          </Box>
        ))}
        {remainingCount > 0 && (
          <Typography sx={{
            fontSize: '0.55rem',
            color: 'text.secondary',
            fontWeight: 'bold'
          }}>
            +{remainingCount}
          </Typography>
        )}
      </>
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
    <Box sx={{ maxWidth: '100%', margin: '0 auto', px: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        borderBottom: '2px solid #1976d2',
        paddingBottom: 1.5
      }}>
        <Button 
          onClick={goToPrevMonth}
          variant="outlined"
          size="small"
          sx={{ 
            borderRadius: 2,
            fontWeight: 'bold',
            minWidth: { xs: '40px', sm: '80px' },
            px: { xs: 1, sm: 2 }
          }}
          startIcon={<span>◀</span>}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>이전 달</Box>
        </Button>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            color: '#1976d2',
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
          }}
        >
          {currentDate.format('YYYY년 MM월')}
        </Typography>
        <Button 
          onClick={goToNextMonth}
          variant="outlined"
          size="small"
          sx={{ 
            borderRadius: 2,
            fontWeight: 'bold',
            minWidth: { xs: '40px', sm: '80px' },
            px: { xs: 1, sm: 2 }
          }}
          endIcon={<span>▶</span>}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>다음 달</Box>
        </Button>
      </Box>
      
      {/* iOS 스타일 달력 */}
      <Box sx={{ 
        width: '100%', 
        overflowX: 'hidden',
        mb: 3 
      }}>
        {/* 요일 헤더 */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.5,
            mb: 0.5
          }}
        >
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <Box key={index} sx={{ textAlign: 'center' }}>
              <Typography 
                align="center" 
                sx={{ 
                  fontWeight: 'bold',
                  py: { xs: 0.5, sm: 0.75 },
                  color: index === 0 ? 'error.main' : 
                         index === 6 ? 'primary.main' : 'inherit',
                  fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' }
                }}
              >
                {day}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* 달력 그리드 - iOS 스타일 */}
        {calendarDays.map((week, weekIndex) => (
          <Box 
            key={weekIndex}
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
              mb: 0.5
            }}
          >
            {week.map((day, dayIndex) => (
              <Box key={dayIndex} sx={{ 
                aspectRatio: '1/1',
                border: 'none',
                borderRadius: 1,
                position: 'relative',
                cursor: 'pointer',
                backgroundColor: isToday(day) ? 'rgba(25, 118, 210, 0.1)' : 
                                (dayIndex === 0 || dayIndex === 6) && isCurrentMonth(day) ? 'rgba(0, 0, 0, 0.02)' : 
                                'transparent',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.05)'
                }
              }} onClick={() => handleDateClick(day)}>
                {/* 날짜 숫자 */}
                <Box sx={{
                  width: '100%',
                  height: '22px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  pt: 0.5
                }}>
                  <Typography sx={{
                    fontSize: { xs: '0.8rem', sm: '0.85rem' },
                    fontWeight: isToday(day) ? 'bold' : 'normal',
                    color: isToday(day) ? 'white' : 
                           !isCurrentMonth(day) ? 'rgb(0, 0, 0, 0.4)' : 
                           dayIndex === 0 ? '#f44336' :
                           dayIndex === 6 ? '#1976d2' : 
                           'inherit',
                    width: isToday(day) ? '22px' : 'auto',
                    height: isToday(day) ? '22px' : 'auto',
                    borderRadius: '50%',
                    backgroundColor: isToday(day) ? '#1976d2' : 'transparent',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {day.date()}
                  </Typography>
                </Box>
                
                {/* 근무자 표시 */}
                {isCurrentMonth(day) && (
                  <Box sx={{ 
                    width: '100%', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    px: 0.25,
                    pt: 0.5
                  }}>
                    {/* 근무자 리스트 */}
                    {renderIOSStyleBadges(day)}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      
      {/* 근무 상세 조회 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
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
          alignItems: 'center',
          py: 2
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '1.2rem'
          }}>
            <Box sx={{
              bgcolor: '#1976d2',
              color: 'white',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              fontWeight: 'bold'
            }}>
              {selectedDate?.date()}
            </Box>
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
              p: 5, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: '#f9f9f9',
              minHeight: '250px'
            }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="h3" sx={{ color: 'rgba(0,0,0,0.2)' }}>
                  ?
                </Typography>
              </Box>
              <Typography 
                variant="h6" 
                sx={{ color: 'text.secondary' }}
              >
                이 날짜에는 등록된 근무 기록이 없습니다.
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ color: 'text.secondary', maxWidth: '450px' }}
              >
                근무 시간 등록 메뉴에서 근무 기록을 추가할 수 있습니다.
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
                      px: 4, 
                      py: 3,
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
          p: 2.5,
          justifyContent: 'center'
        }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="contained"
            sx={{ 
              minWidth: '150px',
              fontWeight: 'bold',
              borderRadius: 2,
              py: 1
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