# 지구 구조대: 마법 행동 뽑기 챌린지

정적(Static) 웹사이트입니다. 별도 빌드 없이 배포할 수 있습니다.

## 로컬 실행
```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

---

## 1) GitHub Pages로 배포 (추천)

이 저장소에는 GitHub Actions 워크플로우가 포함되어 있어 `main` 브랜치로 push하면 자동으로 배포됩니다.

### 준비
1. GitHub 저장소 생성 후 코드 push
2. GitHub 저장소 설정 > **Pages** > Source를 **GitHub Actions**로 선택
3. `main` 브랜치에 push

### 결과
배포 완료 후 `https://<계정명>.github.io/<저장소명>/` 에서 확인.

---

## 2) Vercel로 배포

이 저장소에는 정적 사이트용 `vercel.json`이 포함되어 있습니다.

### CLI 배포
```bash
npm i -g vercel
vercel
vercel --prod
```

### 대시보드 배포
- Vercel에서 저장소 Import
- Framework Preset: `Other`
- Build Command: 비움
- Output Directory: `.`

---

## 3) Netlify로 배포

- Netlify에서 저장소 Import
- Build command: 비움
- Publish directory: `.`

또는 Drag & Drop으로 `index.html`, `script.js`, `styles.css` 업로드.

---

## 운영 체크리스트
- 캐시 문제 방지를 위해 파일 수정 시 강력 새로고침(Ctrl/Cmd+Shift+R)
- HTTPS 도메인에서만 외부 API 연동 기능 확장 권장
- 학생 참여 데이터 저장이 필요하면 추후 Firebase/Supabase 연동 고려
