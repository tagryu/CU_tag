-- 기존 RLS 정책 삭제
DROP POLICY IF EXISTS admin_all_employees ON employees;
DROP POLICY IF EXISTS user_own_employee ON employees;
DROP POLICY IF EXISTS admin_all_attendances ON attendances;
DROP POLICY IF EXISTS user_own_attendances ON attendances;
DROP POLICY IF EXISTS admin_all_schedules ON default_schedules;
DROP POLICY IF EXISTS user_own_schedules ON default_schedules;

-- RLS 비활성화 (개발 환경에서만 권장)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE default_schedules DISABLE ROW LEVEL SECURITY;

-- 또는 간단한 정책만 설정 (실제 운영 환경에서 권장)
-- 직원 테이블의 간단한 RLS 정책
/*
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자에게 테이블 접근 권한
CREATE POLICY allow_all_employees ON employees
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 근태 기록 테이블 RLS
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자에게 테이블 접근 권한
CREATE POLICY allow_all_attendances ON attendances
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 기본 근무 시간 테이블 RLS
ALTER TABLE default_schedules ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자에게 테이블 접근 권한
CREATE POLICY allow_all_default_schedules ON default_schedules
  FOR ALL
  USING (auth.role() = 'authenticated');
*/ 