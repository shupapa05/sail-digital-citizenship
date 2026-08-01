# Google OAuth Setup

SchoolTask Vercel 실험판에서 Google Calendar를 직접 읽기 위한 준비입니다.

## 필요한 값

`.env.local` 또는 Vercel 환경변수에 아래 값을 넣습니다.

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_IDS=
```

로컬 테스트 기본 redirect URI:

```text
http://localhost:3099/api/google/oauth/callback
```

배포 후 redirect URI:

```text
https://배포주소/api/google/oauth/callback
```

## 흐름

1. Google Cloud에서 Calendar API를 켭니다.
2. OAuth 클라이언트 ID를 만듭니다.
3. 위 redirect URI를 승인된 리디렉션 URI에 추가합니다.
4. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`를 채웁니다.
5. 개발 서버를 켜고 `/api/google/oauth/start`로 들어갑니다.
6. 승인 후 표시되는 값을 `GOOGLE_REFRESH_TOKEN`에 넣습니다.
7. `/api/calendar/events`로 캘린더 조회를 확인합니다.

캘린더를 여러 개 읽으려면 `GOOGLE_CALENDAR_IDS`에 쉼표로 입력합니다.

```text
GOOGLE_CALENDAR_IDS=primary,example@group.calendar.google.com,another@group.calendar.google.com
```

또는 테스트 URL에서 바로 지정할 수 있습니다.

```text
/api/calendar/events?calendarIds=primary,example@group.calendar.google.com
```

`GOOGLE_REFRESH_TOKEN`과 `GOOGLE_CLIENT_SECRET`은 공개 저장소에 올리면 안 됩니다.

## 로컬 설정 스크립트

채팅에 비밀값을 붙이지 않고 직접 입력하려면 PowerShell에서 아래를 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-env.ps1
```

발급된 refresh token만 나중에 넣으려면 아래를 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-google-refresh-token.ps1
```
