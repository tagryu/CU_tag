-- 편의점 근태 관리 시스템 데이터베이스 스키마
-- Supabase에서 실행할 SQL 스크립트

-- 직원 테이블
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 근태 기록 테이블
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_hours NUMERIC(5,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, date)
);

-- 기본 근무 시간 템플릿 테이블
CREATE TABLE IF NOT EXISTS default_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, day_of_week)
);

-- 직원 추가 시 자동으로 auth.users에 연결하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (auth_id, name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email, 
         CASE WHEN new.email = 'admin@example.com' THEN 'admin' ELSE 'employee' END);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자가 생성될 때 트리거 등록
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

-- RLS(Row Level Security) 정책 설정

-- 직원 테이블 RLS 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 직원 데이터에 접근 가능
CREATE POLICY admin_all_employees ON employees
  FOR ALL USING (
    (SELECT role FROM employees WHERE auth_id = auth.uid()) = 'admin'
  );

-- 일반 직원은 자신의
CREATE POLICY user_own_employee ON employees
  FOR SELECT USING (auth_id = auth.uid());

-- 근태 기록 테이블 RLS 활성화
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 근태 기록에 접근 가능
CREATE POLICY admin_all_attendances ON attendances
  FOR ALL USING (
    (SELECT role FROM employees WHERE auth_id = auth.uid()) = 'admin'
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
    (SELECT role FROM employees WHERE auth_id = auth.uid()) = 'admin'
  );

-- 일반 직원은 자신의 기본 근무 시간만 조회 가능
CREATE POLICY user_own_schedules ON default_schedules
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE auth_id = auth.uid())
  );

-- 관리자 계정 생성 예시 (supabase에서 auth.users 테이블에 사용자 추가 후)
-- INSERT INTO employees (auth_id, name, email, role)
-- VALUES ('관리자_auth_id', '관리자', 'admin@example.com', 'admin');

-- 테스트 데이터 샘플 (실제 배포 시 제거)
/*
-- 테스트 직원 추가
INSERT INTO employees (name, email, phone, role)
VALUES 
  ('홍길동', 'hong@example.com', '010-1234-5678', 'employee'),
  ('김철수', 'kim@example.com', '010-2345-6789', 'employee'),
  ('이영희', 'lee@example.com', '010-3456-7890', 'employee');

-- 테스트 근태 기록 추가
INSERT INTO attendances (employee_id, date, start_time, end_time, total_hours, status)
VALUES 
  ((SELECT id FROM employees WHERE name = '홍길동'), '2023-11-01', '09:00', '18:00', 8, 'approved'),
  ((SELECT id FROM employees WHERE name = '홍길동'), '2023-11-02', '09:30', '18:30', 8, 'approved'),
  ((SELECT id FROM employees WHERE name = '김철수'), '2023-11-01', '10:00', '19:00', 8, 'approved'),
  ((SELECT id FROM employees WHERE name = '이영희'), '2023-11-02', '14:00', '22:00', 7, 'approved');

-- 테스트 기본 근무 시간 추가
INSERT INTO default_schedules (employee_id, day_of_week, start_time, end_time)
VALUES 
  ((SELECT id FROM employees WHERE name = '홍길동'), 1, '09:00', '18:00'),
  ((SELECT id FROM employees WHERE name = '홍길동'), 2, '09:00', '18:00'),
  ((SELECT id FROM employees WHERE name = '김철수'), 1, '10:00', '19:00'),
  ((SELECT id FROM employees WHERE name = '이영희'), 4, '14:00', '22:00');
*/ 