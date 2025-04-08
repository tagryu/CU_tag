import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Pagination,
  Alert,
  TablePagination,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  FormControlLabel,
  Switch,
  Stack
} from '@mui/material';
import { Grid } from '../components/GridFix';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { attendanceService } from '../services/attendanceService';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { DefaultSchedule, DAY_OF_WEEK_NAMES } from '../types';

// 직접 리액트 요소로 아이콘 임포트 (SVG 문제 해결)
const AccessTimeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

// 탭 패널 인터페이스
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 탭 패널 컴포넌트
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// 어드민 페이지 컴포넌트
const AdminPage: React.FC = () => {
  // 상태 관리
  const [tabValue, setTabValue] = useState(0);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(dayjs().startOf('month')); // 현재 달의 첫날로 기본 설정
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(dayjs().endOf('month')); // 현재 달의 마지막 날로 기본 설정
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs()); // 현재 월 기본 설정
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  
  // 사용자 관리 관련 상태 추가
  const [employees, setEmployees] = useState<any[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    password: '',
    role: 'employee'
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 기본 근무 시간 관련 상태 추가
  const [defaultSchedules, setDefaultSchedules] = useState<DefaultSchedule[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDeleteDialogOpen, setScheduleDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DefaultSchedule | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 1, // 월요일 기본값
    startTime: dayjs().hour(9).minute(0), // 9:00 기본값
    endTime: dayjs().hour(18).minute(0) // 18:00 기본값
  });

  // 월간 전체 근무 시간 및 날짜별 근무 시간 합계 계산
  const [dateWorkHours, setDateWorkHours] = useState<{ [key: string]: number }>({});
  const [totalMonthlyWorkHours, setTotalMonthlyWorkHours] = useState<number>(0);
  
  // 근무 기록 수정 관련 상태
  const [editStartDateTime, setEditStartDateTime] = useState<dayjs.Dayjs | null>(null);
  const [editEndDateTime, setEditEndDateTime] = useState<dayjs.Dayjs | null>(null);
  
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // 관리자 확인
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // 월 변경 시 시작일과 종료일 업데이트
  useEffect(() => {
    const newStartDate = selectedMonth.startOf('month');
    const newEndDate = selectedMonth.endOf('month');
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, [selectedMonth]);

  // 근무 기록 로드
  useEffect(() => {
    loadAttendancesByPeriod();
  }, [startDate, endDate, page, rowsPerPage]);

  // 사용자별 통계 로드
  useEffect(() => {
    loadUserStats();
  }, [startDate, endDate]);

  // 근무 기록 로드 함수 (기간별)
  const loadAttendancesByPeriod = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      
      // 기간별 모든 근무 기록 가져오기
      const records = await attendanceService.getAllAttendancesByPeriod(
        formattedStartDate,
        formattedEndDate
      );
      
      // 사용자 정보를 가져와서 직원 명과 근무타임을 포함
      const { supabase } = await import('../services/supabase');
      const { data: employees } = await supabase.from('employees').select('*');
      
      // 근무 기록에 직원 정보 추가
      const enrichedRecords = records.map((record: any) => {
        const employee = employees?.find((emp: any) => emp.id === record.employee_id);
        return {
          ...record,
          employee_name: employee?.name || '(이름 없음)'
        };
      });
      
      console.log('근무 기록 가공 결과:', enrichedRecords);
      
      // 모든 근무 기록 저장 (엑셀 출력용)
      setAllAttendances(enrichedRecords);
      
      // 페이지네이션 처리 (프론트엔드에서 처리)
      const startIndex = (page - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      
      setTotalCount(enrichedRecords.length);
      setAttendances(enrichedRecords.slice(startIndex, endIndex));
    } catch (err: any) {
      console.error('근무 기록 로드 오류:', err);
      setError(err.message || '근무 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자별 통계 로드 함수
  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      
      const stats = await attendanceService.getUserWorkStats(
        formattedStartDate,
        formattedEndDate
      );
      
      // 사용자 정보를 가져와서 근무타임을 포함
      const { supabase } = await import('../services/supabase');
      const { data: employees } = await supabase.from('employees').select('*');
      
      // 통계에 직원 정보 추가
      const enrichedStats = stats.map((stat: any) => {
        const employee = employees?.find((emp: any) => emp.id === stat.employee_id);
        return {
          ...stat,
          employee_name: employee?.name || '(이름 없음)'
        };
      });
      
      console.log('사용자 통계 가공 결과:', enrichedStats);
      
      setUserStats(enrichedStats);
    } catch (err: any) {
      console.error('사용자 통계 로드 오류:', err);
      setError(err.message || '사용자 통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 월 변경 핸들러
  const handleMonthChange = (newMonth: dayjs.Dayjs | null) => {
    if (newMonth) {
      setSelectedMonth(newMonth);
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 페이지 변경 핸들러
  const handleChangePage = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage + 1);
  };

  // 페이지당 행 수 변경 핸들러
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  // 근무 기록 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (record: any) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  // 근무 기록 삭제 확인 핸들러
  const handleDeleteConfirm = async () => {
    try {
      if (!selectedRecord?.id) return;
      
      await attendanceService.deleteAttendance(selectedRecord.id);
      
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
      
      // 근무 기록 새로고침
      loadAttendancesByPeriod();
    } catch (err: any) {
      console.error('근무 기록 삭제 오류:', err);
      setError(err.message || '근무 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 근무 기록 수정 버튼 클릭 핸들러
  const handleOpenEditRecordDialog = (record: any) => {
    setSelectedRecord(record);
    
    // 시작 및 종료 시간 설정
    const date = record.date;
    const startTime = record.start_time;
    const endTime = record.end_time;
    
    // 날짜와 시간을 결합하여 dayjs 객체 생성
    const startDateTime = dayjs(`${date}T${startTime}`);
    const endDateTime = dayjs(`${date}T${endTime}`);
    
    setEditStartDateTime(startDateTime);
    setEditEndDateTime(endDateTime);
    setEditDialogOpen(true);
  };

  // 근무 기록 수정 저장 핸들러
  const handleEditConfirm = async () => {
    try {
      if (!selectedRecord?.id || !editStartDateTime || !editEndDateTime) {
        setError('편집할 정보가 없습니다.');
        return;
      }
      
      const startDateTimeStr = editStartDateTime.format('YYYY-MM-DDTHH:mm:00');
      const endDateTimeStr = editEndDateTime.format('YYYY-MM-DDTHH:mm:00');
      
      const updatedRecord = {
        employeeId: selectedRecord.employee_id,
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        notes: selectedRecord.notes || ''
      };
      
      console.log('수정할 근무 기록:', updatedRecord);
      
      await attendanceService.updateAttendance(selectedRecord.id, updatedRecord);
      setSuccessMessage('근무 기록이 성공적으로 수정되었습니다.');
      
      // 다이얼로그 닫기 및 상태 초기화
      setEditDialogOpen(false);
      setSelectedRecord(null);
      
      // 근무 기록 새로고침
      loadAttendancesByPeriod();
    } catch (err: any) {
      console.error('근무 기록 수정 오류:', err);
      setError(err.message || '근무 기록 수정 중 오류가 발생했습니다.');
    }
  };

  // 날짜 형식화 도우미 함수
  const formatDateTime = (dateTimeStr: string) => {
    const date = dayjs(dateTimeStr);
    return date.format('YYYY-MM-DD HH:mm');
  };

  // 총 근무 시간 계산 도우미 함수
  const calculateHours = (startDateTime: string, endDateTime: string) => {
    const start = dayjs(startDateTime);
    const end = dayjs(endDateTime);
    return end.diff(start, 'hour', true).toFixed(1);
  };

  // 엑셀 다운로드 함수
  const handleExportToExcel = () => {
    try {
      // 데이터 정리 - 직원별, 날짜별 근무 시간 계산
      const employeeWorkHours: { [key: string]: { [key: string]: number } } = {};
      const employeeNames: string[] = [];
      
      // 모든 직원 목록 구하기 (중복 제거)
      const uniqueEmployees = Array.from(
        new Set(allAttendances.map(record => record.employee_name))
      );
      
      // 직원별 근무 시간 데이터 구조 초기화
      uniqueEmployees.forEach(employeeName => {
        employeeWorkHours[employeeName] = {};
        employeeNames.push(employeeName);
      });
      
      // 직원별, 날짜별 근무 시간 합산
      allAttendances.forEach(record => {
        const employeeName = record.employee_name;
        const date = dayjs(record.date || record.startDateTime?.split('T')[0]).date(); // 일자만 추출 (1-31)
        const hours = record.total_hours ? parseFloat(record.total_hours) : 
                     parseFloat(calculateHours(record.start_time || record.startDateTime, 
                                             record.end_time || record.endDateTime));
        
        // 같은 날에 여러 기록이 있으면 합산
        if (employeeWorkHours[employeeName][date]) {
          employeeWorkHours[employeeName][date] += hours;
        } else {
          employeeWorkHours[employeeName][date] = hours;
        }
      });
      
      // 날짜별 모든 직원의 근무 시간 합계 계산
      const dateWorkHours: { [key: string]: number } = {};
      const daysInMonth = selectedMonth.daysInMonth();
      
      // 날짜별 초기화
      for (let i = 1; i <= daysInMonth; i++) {
        dateWorkHours[i] = 0;
      }
      
      // 각 직원의 각 날짜 근무 시간을 날짜별 합계에 추가
      Object.values(employeeWorkHours).forEach(employeeDays => {
        Object.entries(employeeDays).forEach(([day, hours]) => {
          const dayNum = parseInt(day);
          dateWorkHours[dayNum] += hours;
        });
      });
      
      // 월간 총 근무 시간 계산
      const totalHours = Object.values(dateWorkHours).reduce((sum, hours) => sum + hours, 0);
      
      setDateWorkHours(dateWorkHours);
      setTotalMonthlyWorkHours(totalHours);
      
      // 달력 형태의 CSV 생성
      const monthYear = selectedMonth.format('YYYY년 MM월');
      
      // UTF-8 BOM 추가
      const BOM = '\uFEFF';
      let csvContent = BOM;
      
      // 첫 번째 행: 빈칸 + 1일~15일 날짜 헤더
      csvContent += ',';
      for (let i = 1; i <= 15; i++) {
        csvContent += `${i}일,`;
      }
      csvContent = csvContent.slice(0, -1) + '\n';
      
      // 두 번째 행: 빈칸 + 16일~말일 날짜 헤더
      csvContent += ',';
      for (let i = 16; i <= daysInMonth; i++) {
        csvContent += `${i}일,`;
      }
      csvContent = csvContent.slice(0, -1) + '\n';
      
      // 역할 및 직원 행 추가
      const roles = [
        // 필요 없는 역할 정보 제거
      ];
      
      // 직원 데이터 추가
      uniqueEmployees.forEach((name) => {
        // 직원명 + 1일~15일 근무시간
        csvContent += `${name},`;
        for (let i = 1; i <= 15; i++) {
          const hours = employeeWorkHours[name][i] || 0;
          csvContent += `${hours},`;
        }
        csvContent = csvContent.slice(0, -1) + '\n';
        
        // 16일~말일 근무시간
        csvContent += ','; // 첫 열은 비움
        for (let i = 16; i <= daysInMonth; i++) {
          const hours = employeeWorkHours[name][i] || 0;
          csvContent += `${hours},`;
        }
        csvContent = csvContent.slice(0, -1) + '\n';
      });
      
      // 구분선 추가
      csvContent += '\n';
      
      // 역할 정보 제거 - 더 이상 역할 데이터 추가하지 않음
      
      // 파일명 (YYYY-MM 형식)
      const fileName = `근무기록_${selectedMonth.format('YYYY-MM')}.csv`;
      
      // 다운로드 링크 생성
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('엑셀 내보내기 오류:', err);
      setError(err.message || '엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 날짜별 근무 시간 및 월간 총 근무 시간 계산 함수
  const calculateWorkHoursSummary = () => {
    // 모든 날짜 초기화
    const newDateWorkHours: { [key: string]: number } = {};
    const daysInMonth = selectedMonth.daysInMonth();
    
    for (let i = 1; i <= daysInMonth; i++) {
      newDateWorkHours[i] = 0;
    }
    
    // 날짜별 근무 시간 합계 계산
    allAttendances.forEach(record => {
      const date = dayjs(record.date).date(); // 일자만 추출 (1-31)
      const hours = parseFloat(record.total_hours?.toString() || '0');
      
      if (newDateWorkHours[date] !== undefined) {
        newDateWorkHours[date] += hours;
      }
    });
    
    // 월간 총 근무 시간 계산
    const totalHours = Object.values(newDateWorkHours).reduce((sum, hours) => sum + hours, 0);
    
    setDateWorkHours(newDateWorkHours);
    setTotalMonthlyWorkHours(totalHours);
  };
  
  // 근무 기록이 로드될 때마다 날짜별 합계 계산
  useEffect(() => {
    if (allAttendances.length > 0) {
      calculateWorkHoursSummary();
    }
  }, [allAttendances]);
  
  // 날짜별 근무 시간 색상 결정 함수
  const getHoursColor = (hours: number) => {
    if (hours === 24) return { backgroundColor: '#0066FF', color: 'white', fontWeight: 'bold' }; // 24시간 정확히 - 파란색
    if (hours < 24) return { backgroundColor: '#FFCDD2', color: '#C62828', fontWeight: 'bold' };   // 24시간 미만 - 빨간색
    return { backgroundColor: '#FFF9C4', color: '#F57F17', fontWeight: 'bold' };                   // 24시간 초과 - 노란색
  };

  // 모든 직원 목록 불러오기
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeeList = await attendanceService.getEmployees();
      setEmployees(employeeList);
      setLoading(false);
    } catch (err: any) {
      console.error('직원 목록 로드 오류:', err);
      setError('직원 목록을 불러오는 중 오류가 발생했습니다');
      setLoading(false);
    }
  };

  // 사용자 추가 대화상자 열기
  const handleOpenAddUserDialog = () => {
    setNewUser({
      id: '',
      name: '',
      password: '',
      role: 'employee'
    });
    setUserDialogOpen(true);
  };

  // 사용자 수정 대화상자 열기
  const handleOpenEditUserDialog = (user: any) => {
    setSelectedUser(user);
    setNewUser({
      id: user.id,
      name: user.name || '',
      password: '',
      role: user.role || 'employee'
    });
    setUserDialogOpen(true);
  };

  // 사용자 삭제 대화상자 열기
  const handleOpenDeleteUserDialog = (user: any) => {
    setSelectedUser(user);
    setUserDeleteDialogOpen(true);
  };

  // 사용자 삭제 확인
  const handleUserDeleteConfirm = async () => {
    try {
      if (!selectedUser) return;
      
      setLoading(true);
      
      // Supabase에서 사용자 삭제
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) {
        throw error;
      }
      
      // 성공 메시지 표시
      setSuccessMessage(`사용자 ${selectedUser.name}(${selectedUser.id})가 삭제되었습니다.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // 목록 새로고침
      loadEmployees();
    } catch (err: any) {
      console.error('사용자 삭제 오류:', err);
      setError(`사용자 삭제 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setLoading(false);
      setUserDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // 대화상자에서 입력값 변경 처리
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name) {
      setNewUser({
        ...newUser,
        [name]: value
      });
    }
  };

  // Select 컴포넌트 변경 핸들러 (역할 선택)
  const handleRoleChange = (e: SelectChangeEvent) => {
    setNewUser({
      ...newUser,
      role: e.target.value
    });
  };

  // 사용자 추가 또는 수정 확인
  const handleUserDialogConfirm = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('../services/supabase');
      
      // 폼 유효성 검사
      if (!newUser.id || (!selectedUser && !newUser.password) || !newUser.name) {
        setError('ID, 이름, 비밀번호(신규 등록 시)는 필수입니다.');
        setLoading(false);
        return;
      }
      
      if (selectedUser) {
        // 기존 사용자 수정
        const updateData: any = {
          name: newUser.name,
          role: newUser.role
        };
        
        // 비밀번호가 입력된 경우에만 업데이트
        if (newUser.password) {
          updateData.password = newUser.password;
        }
        
        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', selectedUser.id);
        
        if (error) throw error;
        
        setSuccessMessage(`사용자 ${newUser.name}(${selectedUser.id})가 수정되었습니다.`);
      } else {
        // 신규 사용자 추가
        const { error } = await supabase
          .from('employees')
          .insert([{
            id: newUser.id,
            name: newUser.name,
            password: newUser.password,
            role: newUser.role
          }]);
        
        if (error) throw error;
        
        setSuccessMessage(`사용자 ${newUser.name}(${newUser.id})가 생성되었습니다.`);
      }
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // 사용자 목록 새로고침
      loadEmployees();
    } catch (err: any) {
      console.error('사용자 저장 오류:', err);
      setError(`사용자 저장 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setLoading(false);
      setUserDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // 사용자 관리 탭 변경 시 사용자 목록 로드
  useEffect(() => {
    if (tabValue === 2) {
      loadEmployees();
    }
  }, [tabValue]);

  // 직원 기본 근무 시간 로드
  const loadEmployeeSchedules = async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const schedules = await attendanceService.getDefaultSchedules(employeeId);
      setDefaultSchedules(schedules);
      
      // 선택된 직원 ID 저장
      setSelectedEmployeeId(employeeId);
    } catch (err: any) {
      console.error('기본 근무 시간 로드 오류:', err);
      setError(err.message || '기본 근무 시간을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 기본 근무 시간 추가 대화상자 열기
  const handleOpenAddScheduleDialog = () => {
    setSelectedSchedule(null);
    setNewSchedule({
      dayOfWeek: 1, // 월요일 기본값
      startTime: dayjs().hour(9).minute(0), // 9:00 기본값
      endTime: dayjs().hour(18).minute(0) // 18:00 기본값
    });
    setScheduleDialogOpen(true);
  };
  
  // 기본 근무 시간 수정 대화상자 열기
  const handleOpenEditScheduleDialog = (schedule: DefaultSchedule) => {
    setSelectedSchedule(schedule);
    
    // 시간 문자열을 dayjs 객체로 변환
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    setNewSchedule({
      dayOfWeek: schedule.day_of_week,
      startTime: dayjs().hour(startHour).minute(startMinute),
      endTime: dayjs().hour(endHour).minute(endMinute)
    });
    
    setScheduleDialogOpen(true);
  };
  
  // 기본 근무 시간 삭제 대화상자 열기
  const handleOpenDeleteScheduleDialog = (schedule: DefaultSchedule) => {
    setSelectedSchedule(schedule);
    setScheduleDeleteDialogOpen(true);
  };
  
  // 요일 선택 핸들러
  const handleDayOfWeekChange = (e: SelectChangeEvent<number>) => {
    setNewSchedule({
      ...newSchedule,
      dayOfWeek: Number(e.target.value)
    });
  };
  
  // 시작 시간 변경 핸들러
  const handleStartTimeChange = (newTime: dayjs.Dayjs | null) => {
    if (newTime) {
      setNewSchedule({
        ...newSchedule,
        startTime: newTime
      });
    }
  };
  
  // 종료 시간 변경 핸들러
  const handleEndTimeChange = (newTime: dayjs.Dayjs | null) => {
    if (newTime) {
      setNewSchedule({
        ...newSchedule,
        endTime: newTime
      });
    }
  };
  
  // 기본 근무 시간 추가 또는 수정 확인
  const handleScheduleDialogConfirm = async () => {
    try {
      if (!selectedEmployeeId) {
        setError('선택된 직원이 없습니다.');
        return;
      }
      
      setLoading(true);
      
      // 시간 객체를 문자열로 변환 (HH:MM 형식)
      const startTimeStr = newSchedule.startTime.format('HH:mm');
      const endTimeStr = newSchedule.endTime.format('HH:mm');
      
      if (selectedSchedule) {
        // 기존 일정 수정
        await attendanceService.updateDefaultSchedule(
          selectedSchedule.id,
          {
            dayOfWeek: newSchedule.dayOfWeek,
            startTime: startTimeStr,
            endTime: endTimeStr
          }
        );
        
        setSuccessMessage('기본 근무 시간이 수정되었습니다.');
      } else {
        // 신규 일정 추가
        await attendanceService.addDefaultSchedule({
          employeeId: selectedEmployeeId,
          dayOfWeek: newSchedule.dayOfWeek,
          startTime: startTimeStr,
          endTime: endTimeStr
        });
        
        setSuccessMessage('기본 근무 시간이 추가되었습니다.');
      }
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // 일정 목록 새로고침
      await loadEmployeeSchedules(selectedEmployeeId);
    } catch (err: any) {
      console.error('기본 근무 시간 저장 오류:', err);
      setError(err.message || '기본 근무 시간 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setScheduleDialogOpen(false);
    }
  };
  
  // 기본 근무 시간 삭제 확인
  const handleScheduleDeleteConfirm = async () => {
    try {
      if (!selectedSchedule) return;
      
      setLoading(true);
      
      await attendanceService.deleteDefaultSchedule(selectedSchedule.id);
      
      setSuccessMessage('기본 근무 시간이 삭제되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // 선택된 직원이 있으면 목록 새로고침
      if (selectedEmployeeId) {
        await loadEmployeeSchedules(selectedEmployeeId);
      }
    } catch (err: any) {
      console.error('기본 근무 시간 삭제 오류:', err);
      setError(err.message || '기본 근무 시간 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setScheduleDeleteDialogOpen(false);
      setSelectedSchedule(null);
    }
  };

  // 각 직원별로 실제 그 날짜에 근무한 시간만 계산하는 함수를 정의
  const calculateEmployeeDailyHours = (employeeId: string, day: number) => {
    let dayTotal = 0;
    
    allAttendances.forEach(record => {
      if ((record.employee_id === employeeId || record.employeeId === employeeId) &&
          dayjs(record.date || record.startDateTime?.split('T')[0]).date() === day) {
        const hours = record.total_hours ? parseFloat(record.total_hours) : 
                      parseFloat(calculateHours(record.start_time || record.startDateTime, 
                                              record.end_time || record.endDateTime));
        dayTotal += hours;
      }
    });
    
    return dayTotal;
  };

  // 직원의 월간 총 근무시간을 계산하는 함수
  const calculateEmployeeMonthlyHours = (employeeId: string) => {
    let totalHours = 0;
    const daysInMonth = selectedMonth.daysInMonth();
    
    for (let day = 1; day <= daysInMonth; day++) {
      totalHours += calculateEmployeeDailyHours(employeeId, day);
    }
    
    return totalHours;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' }
      }}>
        <Typography variant="h4" component="h1" sx={{ mb: { xs: 2, sm: 0 } }}>
          관리자 페이지
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => navigate('/dashboard')}
        >
          대시보드로 돌아가기
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
          <Tab label="근무 기록 관리" />
          <Tab label="사용자별 근무 통계" />
          <Tab label="사용자 관리" />
        </Tabs>
      </Box>

      {/* 근무 기록 관리 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              기간 설정
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    label="월 선택"
                    views={['year', 'month']}
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    format="YYYY년 MM월"
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={loadAttendancesByPeriod}
                >
                  조회
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleExportToExcel}
                  disabled={allAttendances.length === 0}
                  startIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M3 4v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1zm5 2h8v2H8V6zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>}
                >
                  엑셀로 내보내기
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>날짜</TableCell>
                          <TableCell>직원명 (근무타임)</TableCell>
                          <TableCell>시작 시간</TableCell>
                          <TableCell>종료 시간</TableCell>
                          <TableCell>총 시간</TableCell>
                          <TableCell align="right">관리</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <CircularProgress size={24} sx={{ my: 1 }} />
                            </TableCell>
                          </TableRow>
                        ) : attendances.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              해당 기간에 근무 기록이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          attendances.map((record) => {
                            console.log('렌더링 중인 근무 기록:', record);
                            const date = record.date || record.startDateTime?.split('T')[0] || '';
                            const startTime = record.start_time || record.startDateTime?.split('T')[1] || '';
                            const endTime = record.end_time || record.endDateTime?.split('T')[1] || '';
                            const totalHours = record.total_hours || record.totalHours || 0;
                            const name = record.employee_name || record.employeeName || '이름 없음';
                            
                            return (
                              <TableRow key={record.id} hover>
                                <TableCell>{dayjs(date).format('YYYY-MM-DD')}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell>{dayjs(`${date}T${startTime}`).format('HH:mm')}</TableCell>
                                <TableCell>{dayjs(`${date}T${endTime}`).format('HH:mm')}</TableCell>
                                <TableCell>{totalHours}시간</TableCell>
                                <TableCell align="right">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleOpenEditRecordDialog(record)}
                                    color="primary"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleDeleteClick(record)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={totalCount}
                    page={page - 1}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="페이지당 행 수:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                  />
                </>
              )}
            </Paper>
          </>
        )}
      </TabPanel>

      {/* 사용자별 근무 통계 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              기간 설정
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <DatePicker
                    views={['year', 'month']}
                    label="월 선택"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={loadUserStats}
                >
                  조회
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleExportToExcel}
                  disabled={allAttendances.length === 0}
                  startIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M3 4v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1zm5 2h8v2H8V6zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>}
                >
                  엑셀 다운로드
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* 월별 일자별 근무 시간 테이블 */}
        <Paper sx={{ width: '100%', mb: 4 }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
            {selectedMonth.format('YYYY년 MM월')} 일별 근무 시간
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      position: 'sticky', 
                      left: 0, 
                      backgroundColor: '#fff', 
                      zIndex: 3,
                      minWidth: '100px',
                      width: '150px'
                    }}
                  >
                    직원명 (근무타임)
                  </TableCell>
                  {Array.from({ length: selectedMonth.daysInMonth() }, (_, i) => i + 1).map((day) => (
                    <TableCell 
                      key={day} 
                      align="center"
                      sx={{ 
                        padding: '8px 2px',
                        fontSize: '0.75rem',
                        width: `${100 / (selectedMonth.daysInMonth() + 2)}%`
                      }}
                    >
                      {day}일
                    </TableCell>
                  ))}
                  <TableCell 
                    align="center" 
                    sx={{ 
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold',
                      width: '80px'
                    }}
                  >
                    합계
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allAttendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedMonth.daysInMonth() + 2} align="center">
                      근무 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {userStats.map((employee) => {
                      const employeeId = employee.employee_id || employee.employeeId;
                      // 직원의 월간 총 근무시간 미리 계산
                      const totalMonthHours = calculateEmployeeMonthlyHours(employeeId);
                      
                      return (
                        <TableRow key={employeeId} hover>
                          <TableCell 
                            sx={{ 
                              position: 'sticky', 
                              left: 0, 
                              backgroundColor: '#fff', 
                              zIndex: 1,
                              fontWeight: 'bold'
                            }}
                          >
                            {employee.employee_name || employee.employeeName}
                          </TableCell>
                          {Array.from({ length: selectedMonth.daysInMonth() }, (_, i) => i + 1).map((day) => {
                            // 각 날짜별 직원 근무시간 계산
                            const dayTotal = calculateEmployeeDailyHours(employeeId, day);

                            return (
                              <TableCell 
                                key={day} 
                                align="center"
                                sx={{ 
                                  padding: '6px 2px',
                                  backgroundColor: dayTotal > 0 ? (
                                    dayTotal > 8 ? 'rgba(25, 118, 210, 0.1)' : 
                                    dayTotal < 4 ? 'rgba(255, 152, 0, 0.1)' : 
                                    'rgba(76, 175, 80, 0.1)'
                                  ) : 'transparent',
                                  color: dayTotal > 0 ? (
                                    dayTotal > 8 ? '#1976d2' : 
                                    dayTotal < 4 ? '#ed6c02' : 
                                    '#2e7d32'
                                  ) : 'inherit',
                                  fontWeight: dayTotal > 0 ? 'bold' : 'normal',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell 
                            align="center" 
                            sx={{ 
                              backgroundColor: '#f5f5f5',
                              fontWeight: 'bold',
                              color: totalMonthHours > 0 ? '#1976d2' : 'inherit'
                            }}
                          >
                            {totalMonthHours.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* 날짜별 합계 행 추가 */}
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          position: 'sticky', 
                          left: 0, 
                          backgroundColor: '#e3f2fd', 
                          zIndex: 1,
                          fontWeight: 'bold',
                          borderTop: '2px solid rgba(224, 224, 224, 1)'
                        }}
                      >
                        일별 합계
                      </TableCell>
                      {Array.from({ length: selectedMonth.daysInMonth() }, (_, i) => i + 1).map((day) => {
                        // 해당 날짜의 모든 직원 근무시간 합계 계산
                        let dayTotal = 0;
                        allAttendances.forEach(record => {
                          const recordDay = dayjs(record.date || record.startDateTime?.split('T')[0]).date();
                          if (recordDay === day) {
                            const hours = record.total_hours ? parseFloat(record.total_hours) : 
                                        parseFloat(calculateHours(record.start_time || record.startDateTime, 
                                                                record.end_time || record.endDateTime));
                            dayTotal += hours;
                          }
                        });
                        
                        const hourStyle = getHoursColor(dayTotal);
                        
                        return (
                          <TableCell 
                            key={day} 
                            align="center"
                            sx={{ 
                              padding: '6px 2px',
                              fontSize: '0.75rem',
                              borderTop: '2px solid rgba(224, 224, 224, 1)',
                              color: hourStyle.color,
                              backgroundColor: hourStyle.backgroundColor
                            }}
                          >
                            {dayTotal.toFixed(1)}
                          </TableCell>
                        );
                      })}
                      <TableCell 
                        align="center" 
                        sx={{ 
                          backgroundColor: '#1976d2',
                          color: 'white',
                          fontWeight: 'bold',
                          borderTop: '2px solid rgba(224, 224, 224, 1)'
                        }}
                      >
                        {/* 모든 직원의 총 근무시간 합계 - 직원별 합계의 총합으로 계산 */}
                        {(() => {
                          // 각 일별 총합을 모두 더함
                          let grandTotal = 0;
                          for (let day = 1; day <= selectedMonth.daysInMonth(); day++) {
                            let dayTotal = 0;
                            allAttendances.forEach(record => {
                              const recordDay = dayjs(record.date || record.startDateTime?.split('T')[0]).date();
                              if (recordDay === day) {
                                const hours = record.total_hours ? parseFloat(record.total_hours) : 
                                          parseFloat(calculateHours(record.start_time || record.startDateTime, 
                                                                  record.end_time || record.endDateTime));
                                dayTotal += hours;
                              }
                            });
                            grandTotal += dayTotal;
                          }
                          return grandTotal.toFixed(1);
                        })()}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* 사용자별 근무 요약 통계 */}
        <Paper sx={{ width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>직원명 (근무타임)</TableCell>
                    <TableCell align="right">근무일수</TableCell>
                    <TableCell align="right">총 근무시간</TableCell>
                    <TableCell align="right">일평균 근무시간</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={24} sx={{ my: 1 }} />
                      </TableCell>
                    </TableRow>
                  ) : userStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        해당 기간에 근무 통계가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userStats.map((stat) => {
                      console.log('렌더링 중인 사용자 통계:', stat);
                      const name = stat.employee_name || stat.employeeName || '이름 없음';
                      const workDays = stat.work_days || stat.workDays || 0;
                      const totalHours = stat.total_hours || stat.totalHours || 0;
                      
                      return (
                        <TableRow key={stat.employee_id || stat.employeeId} hover>
                          <TableCell>{name}</TableCell>
                          <TableCell align="right">{workDays}일</TableCell>
                          <TableCell align="right">{parseFloat(totalHours.toString()).toFixed(1)}시간</TableCell>
                          <TableCell align="right">
                            {workDays > 0 
                              ? (parseFloat(totalHours.toString()) / workDays).toFixed(1) 
                              : '0.0'}
                            시간/일
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </TabPanel>

      {/* 사용자 관리 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">직원 목록</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenAddUserDialog}
                disabled={loading}
              >
                직원 추가
              </Button>
            </Box>
            
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}
          </Paper>
        </Box>

        <Paper sx={{ width: '100%', mb: 4 }}>
          {loading && !selectedEmployeeId ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>직원 ID</TableCell>
                    <TableCell>이름 (근무타임)</TableCell>
                    <TableCell>역할</TableCell>
                    <TableCell align="right">기본 근무 시간</TableCell>
                    <TableCell align="right">관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        등록된 직원이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id} hover>
                        <TableCell>{emp.id}</TableCell>
                        <TableCell>{emp.name || '(이름 없음)'}{emp.work_time ? ` (${emp.work_time})` : ''}</TableCell>
                        <TableCell>
                          <Chip 
                            label={emp.role === 'admin' ? '관리자' : '직원'} 
                            color={emp.role === 'admin' ? 'primary' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<Box component={AccessTimeIcon} sx={{ fontSize: 'small' }} />}
                            onClick={() => loadEmployeeSchedules(emp.id)}
                            color="info"
                          >
                            기본 근무 시간 관리
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenEditUserDialog(emp)}
                            sx={{ mr: 1 }}
                          >
                            수정
                          </Button>
                          <Button 
                            size="small" 
                            color="error"
                            onClick={() => handleOpenDeleteUserDialog(emp)}
                            disabled={emp.id === user?.id} // 현재 사용자는 삭제 불가
                          >
                            삭제
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* 선택된 직원의 기본 근무 시간 목록 */}
        {selectedEmployeeId && (
          <Paper sx={{ width: '100%', mb: 4, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                {employees.find(emp => emp.id === selectedEmployeeId)?.name || selectedEmployeeId} 기본 근무 시간
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddScheduleDialog}
                disabled={loading}
              >
                근무 시간 추가
              </Button>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : defaultSchedules.length === 0 ? (
              <Alert severity="info">
                등록된 기본 근무 시간이 없습니다. '근무 시간 추가' 버튼을 클릭하여 추가하세요.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>요일</TableCell>
                      <TableCell>시작 시간</TableCell>
                      <TableCell>종료 시간</TableCell>
                      <TableCell>근무 시간</TableCell>
                      <TableCell align="right">관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
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
                        <TableRow key={schedule.id} hover>
                          <TableCell>
                            <Chip 
                              label={DAY_OF_WEEK_NAMES[schedule.day_of_week]} 
                              color={
                                schedule.day_of_week === 0 ? 'error' : 
                                schedule.day_of_week === 6 ? 'primary' : 
                                'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{schedule.start_time}</TableCell>
                          <TableCell>{schedule.end_time}</TableCell>
                          <TableCell>{totalHours.toFixed(1)}시간</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditScheduleDialog(schedule)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteScheduleDialog(schedule)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </TabPanel>

      {/* 사용자 추가/수정 다이얼로그 */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        aria-labelledby="user-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="user-dialog-title">
          {selectedUser ? '직원 정보 수정' : '신규 직원 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="id"
              label="직원 ID"
              fullWidth
              value={newUser.id}
              onChange={handleUserInputChange}
              disabled={!!selectedUser} // 기존 사용자 수정 시 ID 변경 불가
              required
            />
            <TextField
              name="name"
              label="이름"
              fullWidth
              value={newUser.name}
              onChange={handleUserInputChange}
              required
            />
            <TextField
              name="password"
              label={selectedUser ? '새 비밀번호 (변경 시에만 입력)' : '비밀번호'}
              type="password"
              fullWidth
              value={newUser.password}
              onChange={handleUserInputChange}
              required={!selectedUser} // 신규 등록 시에만 필수
            />
            <FormControl fullWidth>
              <InputLabel id="role-label">역할</InputLabel>
              <Select
                labelId="role-label"
                name="role"
                value={newUser.role}
                label="역할"
                onChange={handleRoleChange}
              >
                <MenuItem value="employee">직원</MenuItem>
                <MenuItem value="admin">관리자</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>취소</Button>
          <Button onClick={handleUserDialogConfirm} color="primary" disabled={loading}>
            {loading ? '처리 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <Dialog
        open={userDeleteDialogOpen}
        onClose={() => setUserDeleteDialogOpen(false)}
        aria-labelledby="user-delete-dialog-title"
      >
        <DialogTitle id="user-delete-dialog-title">
          직원 삭제 확인
        </DialogTitle>
        <DialogContent>
          <Typography>
            {selectedUser?.name || selectedUser?.id}({selectedUser?.id}) 직원을 정말 삭제하시겠습니까?
          </Typography>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            주의: 이 작업은 되돌릴 수 없습니다. 해당 직원의 모든 근무 기록은 유지됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleUserDeleteConfirm} color="error" disabled={loading}>
            {loading ? '처리 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>근무 기록 수정</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <DatePicker
                    label="시작 날짜"
                    value={editStartDateTime}
                    onChange={(newValue) => setEditStartDateTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                    format="YYYY-MM-DD"
                  />
                  <TextField
                    label="시작 시간"
                    fullWidth
                    value={editStartDateTime ? dayjs(editStartDateTime).format('HH:mm') : ''}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      // HH:MM 형식 확인
                      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue) || timeValue === '') {
                        if (timeValue && editStartDateTime) {
                          const [hours, minutes] = timeValue.split(':').map(Number);
                          const newDateTime = dayjs(editStartDateTime)
                            .hour(hours)
                            .minute(minutes);
                          setEditStartDateTime(newDateTime);
                        }
                      }
                    }}
                    placeholder="HH:MM"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                          <Box component={AccessTimeIcon} sx={{ fontSize: 'small' }} />
                        </Box>
                      ),
                    }}
                    helperText="24시간 형식 (예: 09:30, 18:45)"
                  />
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <DatePicker
                    label="종료 날짜"
                    value={editEndDateTime}
                    onChange={(newValue) => setEditEndDateTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                    format="YYYY-MM-DD"
                  />
                  <TextField
                    label="종료 시간"
                    fullWidth
                    value={editEndDateTime ? dayjs(editEndDateTime).format('HH:mm') : ''}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      // HH:MM 형식 확인
                      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue) || timeValue === '') {
                        if (timeValue && editEndDateTime) {
                          const [hours, minutes] = timeValue.split(':').map(Number);
                          const newDateTime = dayjs(editEndDateTime)
                            .hour(hours)
                            .minute(minutes);
                          setEditEndDateTime(newDateTime);
                        }
                      }
                    }}
                    placeholder="HH:MM"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, color: 'text.secondary', opacity: 0.7, display: 'flex' }}>
                          <Box component={AccessTimeIcon} sx={{ fontSize: 'small' }} />
                        </Box>
                      ),
                    }}
                    helperText="24시간 형식 (예: 09:30, 18:45)"
                  />
                </Stack>
              </Stack>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            취소
          </Button>
          <Button onClick={handleEditConfirm} color="primary" variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 기본 근무 시간 추가/수정 다이얼로그 */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        aria-labelledby="schedule-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="schedule-dialog-title">
          {selectedSchedule ? '기본 근무 시간 수정' : '기본 근무 시간 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="day-of-week-label">요일</InputLabel>
              <Select
                labelId="day-of-week-label"
                value={newSchedule.dayOfWeek}
                label="요일"
                onChange={handleDayOfWeekChange}
              >
                {DAY_OF_WEEK_NAMES.map((dayName, index) => (
                  <MenuItem key={index} value={index}>
                    {dayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TimePicker
                  label="시작 시간"
                  value={newSchedule.startTime}
                  onChange={handleStartTimeChange}
                  sx={{ flex: 1 }}
                  format="HH:mm"
                  ampm={false}
                />
                
                <TimePicker
                  label="종료 시간"
                  value={newSchedule.endTime}
                  onChange={handleEndTimeChange}
                  sx={{ flex: 1 }}
                  format="HH:mm"
                  ampm={false}
                />
              </Box>
            </LocalizationProvider>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              * 종료 시간이 시작 시간보다 이전이면 다음 날까지 근무하는 것으로 간주합니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleScheduleDialogConfirm} 
            color="primary" 
            disabled={loading}
          >
            {loading ? '처리 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 기본 근무 시간 삭제 확인 다이얼로그 */}
      <Dialog
        open={scheduleDeleteDialogOpen}
        onClose={() => setScheduleDeleteDialogOpen(false)}
        aria-labelledby="schedule-delete-dialog-title"
      >
        <DialogTitle id="schedule-delete-dialog-title">
          기본 근무 시간 삭제
        </DialogTitle>
        <DialogContent>
          <Typography>
            {selectedSchedule && `${DAY_OF_WEEK_NAMES[selectedSchedule.day_of_week]} ${selectedSchedule.start_time}~${selectedSchedule.end_time}`} 근무 시간을 정말 삭제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDeleteDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleScheduleDeleteConfirm} 
            color="error" 
            disabled={loading}
          >
            {loading ? '처리 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage; 