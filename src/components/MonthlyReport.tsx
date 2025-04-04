import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Grid } from './GridFix';
import { attendanceService } from '../services/attendanceService';

// ReportData 인터페이스 정의
interface ReportData {
  employeeId: string;
  employeeName: string;
  workDays: number;
  totalHours: number;
  absenceDays: number;
  efficiency?: number;
}

// 월 선택 옵션 인터페이스
interface MonthOption {
  value: string;
  label: string;
}

const MonthlyReport: React.FC = () => {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 현재 년월을 YYYY-MM 형식으로 반환하는 함수
  function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  // 월별 보고서 데이터 로드
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await attendanceService.generateMonthlyReport(month);
        setReportData(data as ReportData[]);
      } catch (err: any) {
        console.error('월별 보고서 로드 오류:', err);
        setError('보고서 데이터를 불러오는 중 오류가 발생했습니다.');
        setReportData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [month]);
  
  // 월 선택 핸들러
  const handleMonthChange = (event: SelectChangeEvent) => {
    setMonth(event.target.value);
  };
  
  // 이용 가능한 월 목록 생성 (현재 월로부터 12개월 전까지)
  const getAvailableMonths = (): MonthOption[] => {
    const months: MonthOption[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    for (let i = 0; i < 12; i++) {
      const year = currentYear - Math.floor((i - currentMonth) / 12);
      const month = (currentMonth - i + 12) % 12 + 1;
      const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
      const label = `${year}년 ${month}월`;
      months.push({ value: formattedMonth, label });
    }
    
    return months;
  };
  
  // 엑셀 다운로드 기능
  const handleExportToExcel = () => {
    // CSV 형식으로 데이터 변환
    let csvContent = "직원명,총 출근일수,총 근무시간,결근일수\n";
    
    reportData.forEach(row => {
      csvContent += `${row.employeeName},${row.workDays},${row.totalHours},${row.absenceDays}\n`;
    });
    
    // CSV 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `월간보고서_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const monthParts = month.split('-');
  const displayMonth = `${monthParts[0]}년 ${monthParts[1]}월`;

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">월간 근태 보고서: {displayMonth}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} container justifyContent="flex-end" spacing={1}>
            <Grid item>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="month-select-label">조회 월</InputLabel>
                <Select
                  labelId="month-select-label"
                  value={month}
                  label="조회 월"
                  onChange={handleMonthChange}
                >
                  {getAvailableMonths().map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleExportToExcel}
                disabled={reportData.length === 0}
              >
                엑셀 다운로드
              </Button>
            </Grid>
          </Grid>
        </Grid>
        
        {loading ? (
          <Typography>로딩 중...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : reportData.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            해당 월에 대한 보고서 데이터가 없습니다.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>직원명</TableCell>
                  <TableCell align="right">출근일수</TableCell>
                  <TableCell align="right">총 근무시간</TableCell>
                  <TableCell align="right">결근일수</TableCell>
                  <TableCell align="right">근무 효율</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell>{employee.employeeName}</TableCell>
                    <TableCell align="right">{employee.workDays}일</TableCell>
                    <TableCell align="right">{employee.totalHours.toFixed(1)}시간</TableCell>
                    <TableCell align="right">{employee.absenceDays}일</TableCell>
                    <TableCell align="right">
                      {employee.efficiency ? `${(employee.efficiency * 100).toFixed(0)}%` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default MonthlyReport; 