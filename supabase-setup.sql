-- 직원 테이블 생성
CREATE TABLE public.employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 직원 테이블 RLS(Row Level Security) 정책 설정
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 직원 데이터에 접근 가능
CREATE POLICY "관리자 전체 권한" ON public.employees
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- 일반 직원은 자신의 데이터만 읽기 가능
CREATE POLICY "직원 본인 데이터 읽기" ON public.employees
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 근태 기록 테이블 생성
CREATE TABLE public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 근태 기록 테이블 RLS 정책 설정
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 근태 기록에 접근 가능
CREATE POLICY "관리자 전체 근태 기록 접근" ON public.attendances
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- 일반 직원은 자신의 근태 기록만 읽기/생성 가능
CREATE POLICY "직원 본인 근태 기록 읽기" ON public.attendances
    FOR SELECT
    TO authenticated
    USING (employee_id = auth.uid());

CREATE POLICY "직원 본인 근태 기록 생성" ON public.attendances
    FOR INSERT
    TO authenticated
    WITH CHECK (employee_id = auth.uid());

-- 시간 겹침 확인용 인덱스 생성
CREATE INDEX attendances_date_time_idx ON public.attendances (date, start_time, end_time);

-- 직원 이름으로 근태 기록 조회를 위한 뷰 생성
CREATE VIEW public.attendance_view AS
SELECT 
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    a.total_hours,
    a.employee_id,
    e.name as employee_name,
    a.created_at,
    a.updated_at
FROM 
    public.attendances a
JOIN 
    public.employees e ON a.employee_id = e.id;

-- 월별 근태 통계를 위한 함수 생성
CREATE OR REPLACE FUNCTION public.get_monthly_statistics(year_month TEXT)
RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    total_days BIGINT,
    total_hours FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.employee_id,
        e.name as employee_name,
        COUNT(DISTINCT a.date) as total_days,
        SUM(a.total_hours) as total_hours
    FROM 
        public.attendances a
    JOIN 
        public.employees e ON a.employee_id = e.id
    WHERE 
        TO_CHAR(a.date, 'YYYY-MM') = year_month
    GROUP BY 
        a.employee_id, e.name;
END;
$$ LANGUAGE plpgsql; 