import React, { useState } from 'react';
import { Button, TextField, Paper, Typography, Container, Box, Alert, Link } from '@mui/material';
import { attendanceService } from '../services/attendanceService';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // ID와 비밀번호 검증
      if (!id || !password) {
        setError('아이디와 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }
      
      console.log('로그인 시도:', id);
      
      // 직접 employees 테이블에서 사용자 조회
      const { data: employeeData, error: queryError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      
      if (queryError) {
        console.error('로그인 오류:', queryError);
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      
      if (!employeeData) {
        setError('존재하지 않는 계정입니다.');
        setLoading(false);
        return;
      }
      
      // 비밀번호 검증 (실제 앱에서는 해시 비교를 해야 함)
      if (employeeData.password !== password) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      
      // 비밀번호 필드 제거 (보안)
      const { password: _, ...safeUserData } = employeeData;
      
      // 인증 컨텍스트에 사용자 정보 저장
      login(safeUserData);
      
      // 대시보드로 이동
      navigate('/dashboard');
    } catch (err: any) {
      console.error('로그인 처리 중 오류:', err);
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            편의점 근태관리 시스템
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="직원 ID"
              name="id"
              autoComplete="username"
              autoFocus
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={loading}
              placeholder="01, 02 등 숫자 ID 입력"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              계정이 없으신가요?{' '}
              <Link component={RouterLink} to="/signup" variant="body2">
                회원가입하기
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 