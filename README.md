# 편의점 근태 관리 시스템

편의점 직원들의 근태를 관리하는 웹 애플리케이션입니다.

## 주요 기능

- 직원 근무 시간 기록 및 관리
- 달력 형태로 근무 기록 확인
- 관리자 페이지에서 직원 관리 및 근태 보고서 생성
- 기본 근무 시간 템플릿 설정 및 적용
- Excel 형식으로 보고서 내보내기

## 기술 스택

- React.js
- TypeScript
- Material-UI
- Supabase (백엔드 및 인증)

## 설치 및 실행 방법

1. 저장소 클론
```
git clone https://github.com/yourusername/convenience-store-attendance.git
cd convenience-store-attendance
```

2. 의존성 설치
```
npm install
```

3. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 필요한 환경 변수를 설정합니다.
```
cp .env.example .env
```

4. 로컬에서 실행
```
npm start
```

## 데이터베이스 설정

이 애플리케이션은 Supabase를 백엔드로 사용합니다. 다음 단계에 따라 데이터베이스를 설정하세요:

1. [Supabase](https://supabase.com/)에 가입하고 새 프로젝트를 생성합니다.
2. Supabase 프로젝트의 SQL 편집기에서 `database-setup.sql` 파일의 내용을 실행합니다.
3. 생성된 URL과 anon key를 `.env` 파일에 설정합니다.

### 데이터베이스 스키마

애플리케이션은 다음 테이블을 사용합니다:

1. `employees` - 직원 정보 저장
   - id, auth_id, name, email, phone, role, created_at, updated_at

2. `attendances` - 근태 기록 저장
   - id, employee_id, date, start_time, end_time, total_hours, status, notes, created_at, updated_at

3. `default_schedules` - 기본 근무 시간 템플릿 저장
   - id, employee_id, day_of_week, start_time, end_time, created_at, updated_at

Row Level Security(RLS)가 설정되어 있어 사용자 권한에 따라 데이터 접근이 제한됩니다:
- 관리자: 모든 데이터 접근 및 수정 가능
- 일반 직원: 자신의 데이터만 접근 및 수정 가능

## 배포 방법

### GitHub Pages에 배포하기

1. `package.json` 파일에서 `homepage` 필드를 수정합니다.
```json
"homepage": "https://your-username.github.io/convenience-store-attendance"
```

2. GitHub 저장소 생성하기
GitHub에서 새 저장소를 생성합니다.

3. 로컬 저장소를 원격 저장소에 연결하기
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/convenience-store-attendance.git
git push -u origin main
```

4. GitHub Pages에 배포하기
```
npm run deploy
```

## 사용 방법

1. 로그인
   - 사용자 계정으로 로그인합니다.

2. 대시보드
   - 근무 시간 등록 및 관리
   - 달력으로 근무 기록 확인

3. 관리자 페이지 (관리자 권한 필요)
   - 직원 관리
   - 근태 보고서 생성 및 내보내기
   - 기본 근무 시간 템플릿 설정

## 라이센스

MIT
