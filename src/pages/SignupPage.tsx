import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import Signup from '../components/Signup';
import { Link as RouterLink } from 'react-router-dom';

const SignupPage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          편의점 근태 관리 시스템
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          새로운 직원 계정을 생성하세요
        </Typography>
      </Box>
      
      <Signup />
      
      <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography variant="body2">
          이미 계정이 있으신가요?{' '}
          <Link component={RouterLink} to="/login" variant="body2">
            로그인하러 가기
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default SignupPage; 