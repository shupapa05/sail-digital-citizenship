# SAIL Digital Citizenship

Google Apps Script로 운영하던 SAIL 디지털 시민성 실천 시스템을 정적 웹앱과 Supabase 저장소로 옮긴 버전입니다.

## 접속 방식

학생과 교사는 모두 같은 주소로 접속합니다.

```text
https://sail-digital-citizenship.vercel.app/
```

- 학생 코드를 입력하면 학생용 화면으로 들어갑니다.
- 교사용 코드를 입력하면 교사용 현황 화면으로 자동 이동합니다.
- `/teacher.html`은 내부 이동용 화면이므로 학생이나 교사에게 따로 안내하지 않아도 됩니다.

## 사용 중인 저장소

- 데이터베이스: Supabase
- 사진 저장: Supabase Storage `sail-proofs`
- 배포: Vercel

## Vercel 배포 설정

- Framework Preset: `Other`
- Build Command: 비워둠
- Install Command: 비워둠
- Output Directory: `.`

## 확인 순서

1. 메인 주소에서 학생 개인코드로 로그인합니다.
2. 미션을 선택하고 선택지, 기록, 사진을 저장합니다.
3. 기록 보기와 통계에서 저장 내역을 확인합니다.
4. 로그아웃 후 같은 메인 주소에서 교사용 코드를 입력합니다.
5. 교사용 현황 화면에서 반 참여 현황과 학생별 기록을 확인합니다.

## 안정화 운영 원칙 (2026-05-08)

학생 화면은 기능 유지(기록 달력, 배 상점 토글, 통계, 배지)를 기준으로 아래 패치를 기본 로딩합니다.

- `src/app.js`
- `src/mission-stage-patch.js`
- `src/records-calendar-patch.js`
- `src/ship-shop-toggle-patch.js`
- `src/student-stats-patch.js`
- `src/student-rewards-patch.js`

안정화 수정은 기능 제거보다 패치 내부 가드/오류 처리 보강을 우선합니다.

## Supabase

브라우저 앱이 Supabase RPC 함수와 일부 테이블을 호출합니다. 필요한 주요 함수는 다음과 같습니다.

- `login_student`
- `get_student_home`
- `save_mission_result`
- `get_monthly_history`
- `get_teacher_dashboard`
- `buy_ship`
- `set_equipped_ship`

교사용 코드는 `teachers` 테이블의 `login_code`를 먼저 확인한 뒤 교사용 화면으로 이동합니다.
