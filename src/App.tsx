import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SignupPage from './pages/SignupPage';
import AdminPage from './pages/AdminPage';
import './App.css';

// 테마 설정 (토스 스타일 미니멀한 디자인)
const theme = createTheme({
  palette: {
    primary: {
      main: '#0066FF', // 토스 블루
      light: '#4D90FE',
      dark: '#0052CC',
    },
    secondary: {
      main: '#333D4B', // 토스 다크 그레이
    },
    error: {
      main: '#F45452', // 경고색
    },
    background: {
      default: '#F9FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333D4B',
      secondary: '#6B7684',
    },
    divider: 'rgba(0, 0, 0, 0.06)',
  },
  typography: {
    fontFamily: [
      'Noto Sans KR',
      'Roboto',
      'sans-serif'
    ].join(','),
    // 모바일에 최적화된 타이포그래피 설정
    h1: {
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '2.125rem',
      }
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '1.75rem',
      }
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '1.5rem',
      }
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '1.25rem',
      }
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '1.125rem',
      }
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '1rem',
      }
    },
    body1: {
      fontSize: '0.875rem',
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '0.9375rem',
      }
    },
    body2: {
      fontSize: '0.8125rem',
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: '0.875rem',
      }
    },
    button: {
      textTransform: 'none', // 버튼 텍스트 대문자 변환 제거
      fontWeight: 500,
    }
  },
  shape: {
    borderRadius: 8, // 모서리 라운딩 일관되게 적용
  },
  components: {
    // 버튼 스타일 조정
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: '8px',
          boxShadow: 'none',
          padding: '8px 16px',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.Mui-disabled': {
            backgroundColor: '#E5E8EB',
            color: '#8B95A1',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          padding: '10px 22px',
        },
        sizeSmall: {
          padding: '4px 10px',
          fontSize: '0.8125rem',
        },
      },
    },
    // 앱바 및 툴바 스타일 조정
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: '#FFFFFF',
          color: '#333D4B',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '56px !important',
          padding: '0 16px !important',
          '@media (min-width:600px)': {
            padding: '0 24px !important',
          },
        },
      },
    },
    // 탭 스타일 조정
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          minWidth: '72px !important',
          padding: '12px 16px',
          '@media (min-width:600px)': {
            fontSize: '0.9375rem',
            minWidth: '120px !important',
          },
          textTransform: 'none',
        },
      },
    },
    // 카드 스타일 조정
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: 'none',
          borderRadius: '12px',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': {
            paddingBottom: '16px',
          },
          '@media (min-width:600px)': {
            padding: '24px',
            '&:last-child': {
              paddingBottom: '24px',
            },
          },
        },
      },
    },
    // 페이퍼 스타일 조정
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: 'none',
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.06)',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    // 필드 스타일 조정
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0066FF',
            },
          },
        },
      },
    },
    // 테이블 스타일 조정
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: '0.875rem',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#FAFBFC',
          color: '#4A5568',
        },
      },
    },
    // 다이얼로그 스타일 조정
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '16px',
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

// 인증된 루트 컴포넌트
const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 관리자 루트 컴포넌트
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route 
              path="/dashboard" 
              element={
                <AuthenticatedRoute>
                  <Dashboard />
                </AuthenticatedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
