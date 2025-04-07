import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Tabs, Tab, Paper, AppBar, Toolbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AttendanceCalendar from '../components/AttendanceCalendar';
import TimeKeeper from '../components/TimeKeeper';
import EmployeeList from '../components/EmployeeList';
import MonthlyReport from '../components/MonthlyReport';
import Grid from '../components/GridFix';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // 로그인 확인
  useEffect(() => {
    if (user) {
      console.log('현재 사용자 ID 설정:', user.id);
    } else {
      console.log('사용자 정보가 없습니다.');
    }
  }, [user]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 로그아웃 처리
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', mb: 3 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: { xs: '48px' }, py: { xs: 0.5 } }}>
          <Typography variant="subtitle1" color="inherit" noWrap>
            편의점 근태 관리 시스템
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1.5 }}>
              {user?.name || user?.id || '사용자'}님
            </Typography>
            {isAdmin && (
              <Button 
                color="primary" 
                variant="outlined" 
                size="small" 
                onClick={() => navigate('/admin')}
                sx={{ 
                  mr: 0.5, 
                  py: 0.5, 
                  px: 1, 
                  fontSize: '0.75rem',
                  minWidth: 'auto'
                }}
              >
                관리자
              </Button>
            )}
            <Button 
              color="primary" 
              variant="outlined" 
              size="small" 
              onClick={handleLogout}
              sx={{ 
                py: 0.5, 
                px: 1, 
                fontSize: '0.75rem',
                minWidth: 'auto'
              }}
            >
              로그아웃
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="근무 시간 등록" />
            <Tab label="근무 기록 확인" />
            {isAdmin && <Tab label="월간 보고서" />}
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <TimeKeeper />
          </Paper>
        )}
        
        {tabValue === 1 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <AttendanceCalendar />
          </Paper>
        )}
        
        {tabValue === 2 && isAdmin && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <MonthlyReport />
          </Paper>
        )}
      </Container>
    </>
  );
};

export default Dashboard; 