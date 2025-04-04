import React, { createContext, useState, useContext, useEffect } from 'react';

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  role: string;
  [key: string]: any;
}

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

// 초기값 설정
const initialContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  login: () => {},
  logout: () => {},
};

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType>(initialContext);

// 컨텍스트 사용을 위한 훅
export const useAuth = () => useContext(AuthContext);

// 로컬 스토리지 키
const USER_STORAGE_KEY = 'convenience-store-user';

// 인증 프로바이더 컴포넌트
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 초기화 시 로컬 스토리지에서 사용자 정보 복원
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(userData.role === 'admin');
      } catch (error) {
        console.error('로컬 스토리지 데이터 파싱 오류:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);
  
  // 로그인 처리
  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.role === 'admin');
    
    // 로컬 스토리지에 사용자 정보 저장
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  };
  
  // 로그아웃 처리
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    
    // 로컬 스토리지에서 사용자 정보 제거
    localStorage.removeItem(USER_STORAGE_KEY);
  };
  
  // 컨텍스트 값
  const value = {
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 