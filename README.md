# 편의점 근태기록 관리 웹앱

수기로 작성하던 근태기록을 웹앱으로 전환하여 관리 효율성을 증대하기 위한 프로젝트입니다. 이 앱은 직원들의 근무 시간을 정확하게 기록하고, 월별 정산 과정을 간소화하며, 데이터를 엑셀 형식으로 내보내는 기능을 제공합니다.

## 주요 기능

- **사용자 관리 (관리자)**
  - 직원별 고유 아이디 생성 및 로그인 기능
  - 사용자 권한 설정 (일반 직원, 관리자)

- **근태기록 입력**
  - 직원이 자신의 근무 날짜와 시간 입력
  - 근무시간 수정 및 삭제 기능 (권한에 따라 제한)
  - 근무시간 중복 입력 방지 기능

- **관리자 기능**
  - 직원별, 날짜별 근태 현황 조회
  - 월 단위 근태 내역 조회 및 합산 기능
  - 월말 정산 시 근태 데이터 엑셀 파일 다운로드 기능

## 기술 스택

- 프론트엔드: React, TypeScript, Material-UI
- 백엔드: Supabase (서버리스 DB & 인증 서비스)
- 엑셀 출력: XLSX 라이브러리

## 설치 및 실행 방법

1. 저장소 클론
   ```
   git clone [repo-url]
   cd convenience-store-attendance
   ```

2. 필요한 패키지 설치
   ```
   npm install
   ```

3. 환경 변수 설정 (.env.local 파일 생성)
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_KEY=your_supabase_anon_key
   ```

4. 개발 서버 실행
   ```
   npm start
   ```

## Supabase 데이터베이스 설정

다음 테이블을 Supabase에서 생성해야 합니다:

1. `employees` 테이블 (사용자 정보)
   - id (UUID): 사용자 ID (Auth와 연동)
   - name (Text): 이름
   - phone (Text): 연락처
   - role (Text): 권한 (admin 또는 employee)

2. `attendances` 테이블 (근태 기록)
   - id (UUID): 기록 ID
   - employeeId (UUID): 직원 ID (employees 테이블과 연결)
   - date (Date): 근무 날짜
   - startTime (Time): this 시작 시간
   - endTime (Time): 종료 시간
   - totalHours (Float): 총 근무 시간
   - createdAt (Timestamp): 생성 시간
   - updatedAt (Timestamp): 수정 시간

## 향후 개선 계획

- 지점별 직원 관리 기능 추가
- 급여 계산 및 관리 기능 통합
- 모바일 앱 버전 개발

## 라이센스

MIT
