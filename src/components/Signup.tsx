import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Container,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { supabase } from '../services/supabase';

const Signup = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string>('01');

  // 다음 사용할 수 있는 ID를 자동으로 계산
  useEffect(() => {
    // 테이블 구조 확인
    const checkTableStructure = async () => {
      try {
        console.log('테이블 구조 확인 중...');
        
        // employees 테이블 구조 확인
        const { data: employeesInfo, error: employeesError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'employees')
          .eq('table_schema', 'public');
          
        if (employeesError) {
          console.error('employees 테이블 구조 확인 오류:', employeesError);
        } else {
          console.log('employees 테이블 구조:', employeesInfo);
        }
        
        // 직접 employees 테이블 쿼리 시도
        const { data: employees, error: queryError } = await supabase
          .from('employees')
          .select('*')
          .limit(5);
          
        if (queryError) {
          console.error('employees 테이블 쿼리 오류:', queryError);
        } else {
          console.log('employees 테이블 데이터 샘플:', employees);
        }
        
      } catch (err) {
        console.error('테이블 구조 확인 중 오류:', err);
      }
    };
    
    const fetchNextAvailableId = async () => {
      try {
        // 기존 직원 목록 가져오기
        const { data: employees, error } = await supabase
          .from('employees')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);

        if (error) {
          console.error('직원 목록 조회 오류:', error);
          return;
        }

        // 가장 높은 숫자 ID + 1 계산
        if (employees && employees.length > 0) {
          const highestId = employees[0].id;
          if (typeof highestId === 'string' && /^\d+$/.test(highestId)) {
            // 숫자로 된 ID인 경우
            const nextNumber = parseInt(highestId) + 1;
            setNextId(nextNumber.toString().padStart(2, '0'));
            setUserId(nextNumber.toString().padStart(2, '0'));
          } else {
            // 기본값 사용
            setNextId('01');
            setUserId('01');
          }
        } else {
          // 직원이 없는 경우 첫 번째 ID는 01
          setNextId('01');
          setUserId('01');
        }
      } catch (err) {
        console.error('다음 ID 계산 중 오류:', err);
      }
    };
    
    checkTableStructure();
    fetchNextAvailableId();
  }, []);

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 입력 검증
      if (!userId || !password || !name) {
        setError('ID, 비밀번호, 이름은 필수 입력 항목입니다.');
        return;
      }

      // 중복 ID 확인
      console.log('ID 중복 확인:', userId);
      
      const { data: existingUser, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', userId)
        .maybeSingle(); // single() 대신 maybeSingle() 사용

      console.log('중복 확인 결과:', existingUser, checkError);
      
      if (existingUser) {
        setError('이미 사용 중인 ID입니다. 다른 ID를 입력해주세요.');
        return;
      }

      // employees 테이블에 직원 정보 추가
      console.log('직원 정보 추가 시도:', { id: userId, name, password, role });
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert([
          {
            id: userId,
            name,
            password: password, // 실제 환경에서는 암호화 필요
            role,
          }
        ])
        .select();
      
      console.log('직원 정보 추가 결과:', employeeData, employeeError);

      if (employeeError) {
        console.error('직원 정보 추가 오류:', employeeError);
        setError(`직원 정보 추가 중 오류가 발생했습니다: ${employeeError.message}`);
        return;
      }

      console.log('직원 정보 추가 성공:', employeeData);
      setSuccess('회원가입이 완료되었습니다! 로그인해주세요.');
      
      // 폼 초기화
      setUserId('');
      setPassword('');
      setName('');
      setRole('staff');
      
      // 다음 ID 계산
      const nextNumber = parseInt(nextId) + 1;
      setNextId(nextNumber.toString().padStart(2, '0'));
      setUserId(nextNumber.toString().padStart(2, '0'));
      
    } catch (err: any) {
      console.error('회원가입 중 예상치 못한 오류:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          직원 회원가입
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        <Box component="form" noValidate sx={{ mt: 2 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="userId"
            label="직원 ID (숫자)"
            name="userId"
            autoFocus
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            sx={{ mb: 2 }}
            helperText={`숫자로 된 간단한 ID(예: 01, 02)를 입력하세요. 추천 ID: 다음 사용 가능한 ID는 ${nextId}입니다.`}
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
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="이름"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleSignup}
            disabled={loading}
            sx={{ mt: 2, mb: 2 }}
          >
            {loading ? '처리 중...' : '회원가입'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup; 