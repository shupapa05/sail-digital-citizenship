# SAIL Digital Citizenship

Google Apps Script로 운영하던 SAIL 디지털 시민성 실천 시스템을 빠른 정적 웹앱과 Supabase 저장소로 옮긴 버전입니다.

## 화면

- 학생용: `/`
- 교사용: `/teacher.html`

## 사용 중인 저장소

- 데이터베이스: Supabase
- 사진 저장: Supabase Storage `sail-proofs`
- 배포 추천: Vercel

## Vercel 배포 설정

- Framework Preset: `Other`
- Build Command: 비워둠
- Install Command: 비워둠
- Output Directory: `.`

## 확인 순서

1. 학생용에서 개인코드로 로그인합니다.
2. 미션을 선택하고 선택지, 기록, 사진을 저장합니다.
3. 기록 보기에서 저장 내역을 확인합니다.
4. 교사용 `/teacher.html`에서 반 코드 `3-1`을 입력합니다.

## Supabase

브라우저 앱이 Supabase RPC 함수를 호출합니다. 필요한 주요 함수는 다음과 같습니다.

- `login_student`
- `get_student_home`
- `save_mission_result`
- `get_monthly_history`
- `get_teacher_dashboard`
