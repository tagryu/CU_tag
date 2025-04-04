import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Supabase URL과 API 키 설정 (실제 값으로 대체해야 함)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gdchnwqyfupizlugfwys.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY2hud3F5ZnVwaXpsdWdmd3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI0OTIyMTQsImV4cCI6MjAyODA2ODIxNH0.XOqZ-6jMV9WmZ8XcEHxh9JydJ7nK-yjVPUn_FPCgj0c';

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});

// 로그인 관련 서비스
export const authService = {
  // 로그인
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },
  
  // 로그아웃
  logout: async () => {
    return await supabase.auth.signOut();
  },
  
  // 현재 세션 가져오기
  getSession: async () => {
    return await supabase.auth.getSession();
  },
  
  // 현재 사용자 가져오기
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
  
  // 직원 등록 함수 추가
  register: async (email: string, password: string, userData: any) => {
    try {
      // 이메일/비밀번호 기반 인증이 아닌 직원 ID 기반 인증을 사용하는 경우
      // 직접 employees 테이블에 레코드 추가
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            id: userData.id || email.split('@')[0], // ID가 없으면 이메일 앞부분 사용
            name: userData.name,
            password: password, // 실제 환경에서는 암호화 필요
            role: userData.role || 'staff',
          }
        ])
        .select();
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('직원 등록 오류:', error);
      return { data: null, error };
    }
  },
  
  // 유저 프로필 가져오기
  getUserProfile: async () => {
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) return null;
    
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    return data;
  },
  
  // 인증 상태 변경 감지
  onAuthStateChange: (callback: Function) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
}; 