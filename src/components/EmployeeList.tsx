import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Alert
} from '@mui/material';
import { attendanceService } from '../services/attendanceService';
import { authService } from '../services/supabase';
import { User } from '../types';

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // 신규 직원 등록 폼 상태
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee'
  });

  // 직원 목록 불러오기
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await attendanceService.getEmployees();
        setEmployees(data);
      } catch (err: any) {
        console.error('직원 목록 로드 오류:', err);
        setError('직원 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // 다이얼로그 토글
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    // 폼 초기화
    setNewEmployee({
      name: '',
      email: '',
      password: '',
      role: 'employee'
    });
  };

  // 신규 직원 등록 처리
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password || !newEmployee.role) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Supabase를 통해 신규 직원 계정 생성
      const { data, error } = await authService.register(
        newEmployee.email,
        newEmployee.password,
        {
          name: newEmployee.name,
          role: newEmployee.role,
        }
      );
      
      if (error) {
        throw error;
      }
      
      // 성공 메시지 표시
      setSnackbar({
        open: true,
        message: '직원이 성공적으로 등록되었습니다.',
        severity: 'success'
      });
      
      // 목록 새로고침 - fetchEmployees 함수 직접 정의하여 호출
      const fetchEmployees = async () => {
        try {
          const data = await attendanceService.getEmployees();
          setEmployees(data);
        } catch (err) {
          console.error('직원 목록 새로고침 오류:', err);
        }
      };
      
      await fetchEmployees();
      
      // 입력 필드 초기화
      setNewEmployee({
        name: '',
        email: '',
        password: '',
        role: 'employee'
      });
      
      // 다이얼로그 닫기
      handleCloseDialog();
    } catch (error: any) {
      console.error('직원 등록 오류:', error);
      setError(error.message || '직원 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 스낵바 닫기
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 텍스트 필드 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewEmployee({
        ...newEmployee,
        [name]: value
      });
    }
  };

  // Select 컴포넌트 변경 핸들러 - 타입 오류 해결
  const handleRoleChange = (e: SelectChangeEvent<'admin' | 'employee'>) => {
    setNewEmployee({
      ...newEmployee,
      role: e.target.value as 'admin' | 'employee'
    });
  };

  // 직원 수정 핸들러
  const handleEditClick = (employee: User) => {
    // 직원 수정 기능 구현
    alert('직원 정보 수정 기능은 아직 구현되지 않았습니다.');
  };

  // 직원 삭제 핸들러
  const handleDeleteClick = (employeeId: string) => {
    // 직원 삭제 기능 구현
    alert('직원 삭제 기능은 아직 구현되지 않았습니다.');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">직원 관리</Typography>
        <Button variant="contained" color="primary" onClick={handleOpenDialog}>
          신규 직원 등록
        </Button>
      </Box>
      
      {loading ? (
        <Typography>로딩 중...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>이름</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    등록된 직원이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell>
                      {employee.role === 'admin' ? '관리자' : '일반 직원'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleEditClick(employee)}
                        sx={{ mr: 1 }}
                      >
                        수정
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(employee.id)}
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
      
      {/* 신규 직원 등록 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>신규 직원 등록</DialogTitle>
        <DialogContent>
          <DialogContentText>
            신규 직원 정보를 입력해주세요. 직원은 등록된 이메일과 비밀번호로 로그인할 수 있습니다.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="직원 이름"
            type="text"
            fullWidth
            variant="outlined"
            value={newEmployee.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="이메일"
            type="email"
            fullWidth
            variant="outlined"
            value={newEmployee.email}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={newEmployee.password}
            onChange={handleInputChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-label">권한</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={newEmployee.role}
              label="권한"
              onChange={handleRoleChange}
            >
              <MenuItem value="employee">일반 직원</MenuItem>
              <MenuItem value="admin">관리자</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleAddEmployee} variant="contained" color="primary">
            등록
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 알림 스낵바 */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeeList; 