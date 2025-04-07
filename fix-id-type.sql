-- 기존 테이블의 ID 유형을 UUID에서 TEXT로 변경
-- 먼저 기존 테이블의 외래 키 제약 조건 제거

-- Default Schedules 테이블에서 외래 키 제약 조건 제거
ALTER TABLE default_schedules DROP CONSTRAINT IF EXISTS default_schedules_employee_id_fkey;

-- Attendances 테이블에서 외래 키 제약 조건 제거
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_employee_id_fkey;

-- Employees 테이블의 PK 제약 조건 제거
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_pkey;

-- Employees 테이블의 ID 열 유형을 TEXT로 변경
ALTER TABLE employees ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Employees 테이블의 PK 제약 조건 다시 추가
ALTER TABLE employees ADD PRIMARY KEY (id);

-- Attendances 테이블의 employee_id 열 유형을 TEXT로 변경
ALTER TABLE attendances ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;

-- Default Schedules 테이블의 employee_id 열 유형을 TEXT로 변경
ALTER TABLE default_schedules ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;

-- 외래 키 제약 조건 다시 추가
ALTER TABLE attendances ADD CONSTRAINT attendances_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE default_schedules ADD CONSTRAINT default_schedules_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- 시퀀스 생성 (자동 증가 ID를 위한 옵션)
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

-- 기존 테스트 관리자 계정 생성
INSERT INTO employees (id, name, password, role, email)
VALUES ('admin', '관리자', 'admin123', 'admin', 'admin@example.com')
ON CONFLICT (id) DO NOTHING;

-- 샘플 사용자 계정 생성
INSERT INTO employees (id, name, password, role, email)
VALUES ('100', '직원1', '123456', 'employee', '100@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, name, password, role, email)
VALUES ('101', '직원2', '123456', 'employee', '101@example.com')
ON CONFLICT (id) DO NOTHING; 