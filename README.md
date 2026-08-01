# SchoolTask 2.0

새 구조로 만드는 SchoolTask입니다.

## 목표

- Apps Script 의존도를 줄이고 Vercel/Supabase 중심으로 전환
- 학교업무, 학급경영, 개인일정을 한 화면에서 처리
- 달력은 업무/학급/개인 3분류만 표시하고 클릭 시 주요 내용을 펼침
- 수행평가와 NEIS 연동은 안정화된 뒤 단계적으로 이전

## 현재 상태

- Next.js 앱 첫 화면 구성
- Google Calendar API 재사용
- Supabase `schooltask_` 테이블 설계 재사용
- 학급경영 기본 입력 UI 추가

## 실행

```bash
npm install
npm run dev
```
