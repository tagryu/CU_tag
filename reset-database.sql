-- 데이터베이스 초기화 및 재구성 스크립트
-- 주의: 이 스크립트는 기존 테이블을 모두 삭제하고 다시 생성합니다

-- 기존 트리거 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_employees_modtime ON employees;
DROP TRIGGER IF EXISTS update_attendances_modtime ON attendances;
DROP TRIGGER IF EXISTS update_default_schedules_modtime ON default_schedules;

-- 기존 함수 제거
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_modified_column();

-- 기존 정책 제거
DROP POLICY IF EXISTS admin_all_employees ON employees;
DROP POLICY IF EXISTS user_own_employee ON employees;
DROP POLICY IF EXISTS admin_all_attendances ON attendances;
DROP POLICY IF EXISTS user_own_attendances ON attendances;
DROP POLICY IF EXISTS admin_all_schedules ON default_schedules;
DROP POLICY IF EXISTS user_own_schedules ON default_schedules;

-- 기존 테이블 삭제 (외래 키 제약조건으로 인해 순서 중요)
DROP TABLE IF EXISTS default_schedules;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS employees;

-- UUID 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 직원 테이블 생성
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  auth_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 근태 기록 테이블 생성
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_hours NUMERIC(5,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, date)
);

-- 기본 근무 시간 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS default_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, day_of_week)
);

-- 테이블 업데이트 시 updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 직원 테이블 업데이트 트리거
CREATE TRIGGER update_employees_modtime
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 근태 기록 테이블 업데이트 트리거
CREATE TRIGGER update_attendances_modtime
  BEFORE UPDATE ON attendances
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 기본 근무 시간 테이블 업데이트 트리거
CREATE TRIGGER update_default_schedules_modtime
  BEFORE UPDATE ON default_schedules
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 직원 추가 시 자동으로 auth.users에 연결하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (auth_id, name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', new.email), 
    new.email, 
    CASE WHEN new.email = 'admin@example.com' THEN 'admin' ELSE 'employee' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자가 생성될 때 트리거 등록
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS(Row Level Security) 정책 설정
-- 직원 테이블 RLS 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 직원 데이터에 접근 가능
CREATE POLICY admin_all_employees ON employees
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_id FROM employees WHERE role = 'admin'
    )
  );

-- 일반 직원은 자신의 데이터만 조회 가능
CREATE POLICY user_own_employee ON employees
  FOR SELECT USING (auth_id = auth.uid());

-- 근태 기록 테이블 RLS 활성화
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 근태 기록에 접근 가능
CREATE POLICY admin_all_attendances ON attendances
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_id FROM employees WHERE role = 'admin'
    )
  );

-- 일반 직원은 자신의 근태 기록만 조회/추가/수정 가능
CREATE POLICY user_own_attendances ON attendances
  FOR ALL USING (
    employee_id = (SELECT id FROM employees WHERE auth_id = auth.uid())
  );

-- 기본 근무 시간 테이블 RLS 활성화
ALTER TABLE default_schedules ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 기본 근무 시간에 접근 가능
CREATE POLICY admin_all_schedules ON default_schedules
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_id FROM employees WHERE role = 'admin'
    )
  );

-- 일반 직원은 자신의 기본 근무 시간만 조회 가능
CREATE POLICY user_own_schedules ON default_schedules
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE auth_id = auth.uid())
  );

-- 관리자 계정 수동 생성 (이미 auth.users에 계정이 있는 경우)
-- 여기에 실제 admin 계정의 auth_id를 넣으세요
DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- auth.users 테이블에서 첫 번째 사용자의 id를 가져옵니다
  SELECT id INTO admin_auth_id FROM auth.users LIMIT 1;
  
  -- 이미 등록된 관리자가 있는지 확인
  IF NOT EXISTS (SELECT 1 FROM employees WHERE role = 'admin') AND admin_auth_id IS NOT NULL THEN
    INSERT INTO employees (auth_id, name, email, role)
    SELECT 
      id, 
      COALESCE(raw_user_meta_data->>'name', email),
      email,
      'admin'
    FROM auth.users
    WHERE id = admin_auth_id
    ON CONFLICT (auth_id) DO UPDATE
    SET role = 'admin';
  END IF;
END
$$; 