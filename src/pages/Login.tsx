import React, { useState } from 'react';
import { Button, TextField, Paper, Typography, Container, Box, Alert, Link } from '@mui/material';
import { attendanceService } from '../services/attendanceService';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !password) {
      setError('ID와 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 직원 테이블에서 ID와 비밀번호 확인
      const data = await attendanceService.loginWithId(userId, password);
      
      if (!data) {
        throw new Error('로그인에 실패했습니다. ID와 비밀번호를 확인해주세요.');
      }
      
      // 로그인 성공 - 세션에 사용자 정보 저장
      login(data);
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('로그인 에러:', error);
      setError(error.message || '로그인에 실패했습니다. ID와 비밀번호를 확인해주세요.');
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
          
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="userId"
              label="직원 ID"
              name="userId"
              autoComplete="username"
              autoFocus
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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