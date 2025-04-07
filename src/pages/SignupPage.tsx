import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert, Link, Paper, FormControlLabel, Checkbox } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from '../services/supabase';

const SignupPage = () => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // 기본 유효성 검사
      if (!id || !password || !name) {
        setError('모든 필드를 입력해주세요.');
        return;
      }
      
      // 직원 등록
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          id,
          name,
          password,
          role: 'employee',
          email: `${id}@example.com`
        }])
        .select()
        .single();
      
      if (error) {
        console.error('회원가입 오류:', error);
        setError(error.message || '회원가입 중 오류가 발생했습니다.');
        return;
      }
      
      console.log('회원가입 성공:', data);
      
      // 로그인 페이지로 이동
      navigate('/login', { 
        state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } 
      });
    } catch (err: any) {
      console.error('회원가입 처리 중 오류:', err);
      setError(err?.message || '회원가입 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" sx={{ mb: 3 }}>
            회원가입
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="ID"
              name="id"
              autoComplete="id"
              autoFocus
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="name"
              label="이름 (선택)"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="비밀번호 확인"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={isAdmin} 
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  disabled={loading}
                />
              }
              label="관리자 계정으로 생성"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? '처리 중...' : '회원가입'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                이미 계정이 있으신가요?{' '}
                <Link component={RouterLink} to="/login" variant="body2">
                  로그인하기
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SignupPage; 