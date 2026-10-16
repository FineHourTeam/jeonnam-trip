---
name: setup-sentry-autofix
description: Sentry 신규 에러를 감지해 자동으로 원인 분석·수정·PR까지 생성하는 Ops Loop 모듈을 설치한다. 시크릿 등록·GitHub PAT 발급·Sentry 웹훅 연동·Firebase Function 배포를 안내하며 진행한다.
argument-hint: (인자 없음)
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Sentry AutoFix 설치 (Ops Loop 모듈)

> **키트 원본 파일이 필요하다.** 아래 `templates/…` 경로는 키트 저장소 기준이다 — 설치 뒤에는 프로젝트에 없으므로 먼저
> `[ -d /tmp/rcs ] || git clone --depth 1 https://github.com/FineHourTeam/fine-harness-react-kit.git /tmp/rcs`로 받고
> `/tmp/rcs/templates/…`에서 복사한다. 끝나면 `rm -rf /tmp/rcs`.

> 웹은 Firebase Crashlytics를 지원하지 않는다 — 웹 에러 모니터링 표준은 Sentry이고, 이 모듈은
> Sentry를 감지 소스로 쓴다.
>
> 이 스킬은 **한 프로젝트에 한 번** 실행하는 설정 스킬이다. 매 작업마다 자동 실행되지 않는다.
> 완료하면: 프로덕션에서 신규 에러 발생 → Sentry 웹훅 → Firebase Function이 GitHub Actions를
> 트리거 → Claude가 원인 분석·수정 → `src/` 앱 코드만 바뀌었는지 검사 → 별도 Claude가 리뷰 승인 →
> 검증 명령어(lint/typecheck/test) 통과 → PR 생성, 까지 무인으로 돈다. 머지는 항상 사람이 한다 (자동 머지 없음).
>
> ⚠️ Sentry DSN은 공개 값이라 **누구나 가짜 에러를 보내 Claude에게 지시를 끼워 넣을 수 있다.** 그래서
> 워크플로우는 "Claude 실행(API 키 O·쓰기 X·코드 실행 X) / 검증(시크릿 X) / PR 생성(쓰기 O·코드 실행 X)"
> 세 job으로 권한을 나눠 두었다. 이 분리와 경로 검사, 하루 실행 상한(`MAX_RUNS_PER_DAY`)은 **완화하지 말 것.**

각 Step은 **완료 후 사용자에게 결과를 보여주고 다음으로 진행할지 확인**받는다. 되돌리기 어려운 동작
(시크릿 등록, PAT 발급, `firebase deploy`) 전에는 반드시 실행할 명령을 먼저 보여주고 승인을 받는다.

**전제**: 앱에 `@sentry/react`가 이미 연동되어 있고(`src/lib/sentry.ts`), 빌드 시 소스맵이 Sentry로
업로드되고 있어야 분석 품질이 나온다 (`@sentry/vite-plugin`). 안 되어 있으면 이 연동부터 안내.

---

## Step 0: 사전 조건 확인

```bash
gh --version
gh auth status
firebase --version
firebase login:list
git remote -v
```

확인할 것:
- `gh` CLI 로그인 상태 (아니면 `gh auth login` 안내 후 대기)
- `firebase` CLI 로그인 상태 (아니면 `firebase login` 안내 후 대기)
- 현재 레포의 GitHub `owner/repo` (git remote에서 파싱)
- `functions/` 디렉토리 존재 여부 (없으면 "Firebase Functions가 아직 초기화 안 됨 — `firebase init functions` 먼저 실행 필요" 안내 후 **중단**)
- `package.json`에 `@sentry/react` 존재 여부 (없으면 Sentry 연동부터 안내 후 **중단**)
- 프로젝트 기본 브랜치 확인 (보통 `main`, 다르면 사용자에게 질문)

---

## Step 1: 설정값 수집

사용자에게 한 번에 하나씩 질문:

1. **GitHub owner/repo**가 `[owner]/[repo]`로 맞는지 확인 (git remote에서 자동 추출한 값 제시, 다르면 정정 받기)
2. **기본 브랜치**는 무엇인가요? (기본값: `main`)
3. **Node 버전**은? (`.github/workflows/react-ci.yml` 또는 `node --version` 결과 자동 제안, 확인만 받기)

수집한 값을 변수로 저장: `{{GITHUB_OWNER}}`, `{{GITHUB_REPO}}`, `{{BASE_BRANCH}}`, `{{NODE_VERSION}}`

---

## Step 2: ANTHROPIC_API_KEY 시크릿 등록

이미 `.secrets/.env`에 `ANTHROPIC_API_KEY`가 있으면 그 값을 재사용할지 물어본다. 없으면 새로 입력받는다
(입력값은 터미널에 echo하지 않는다).

**실행 전 사용자에게 보여줄 명령** (값은 마스킹해서 표시):
```bash
gh secret set ANTHROPIC_API_KEY --repo {{GITHUB_OWNER}}/{{GITHUB_REPO}}
```

승인 후 실행. 실행 결과(성공/실패)만 보고하고 값은 절대 다시 출력하지 않는다.

---

## Step 3: 워크플로우 파일 설치

`templates/ci/sentry-autofix.yml`을 `.github/workflows/sentry-autofix.yml`로 복사하고
아래 플레이스홀더를 Step 1 값으로 치환:

| 플레이스홀더 | 치환 값 |
|-------------|--------|
| `[BASE_BRANCH]` | `{{BASE_BRANCH}}` |
| `[NODE_VERSION]` | `{{NODE_VERSION}}` |

`.github/workflows/` 폴더가 없으면 생성한다. 이미 같은 이름 파일이 있으면 덮어쓰기 전 확인받는다.

---

## Step 4: GitHub PAT 발급 (사람 필수 개입 — 자동화 불가)

Firebase Function이 GitHub Actions를 원격 트리거하려면 fine-grained Personal Access Token이 필요하다.
아래 안내를 **그대로 출력**하고 완료될 때까지 대기:

```
🔑 GitHub PAT 발급이 필요합니다 (자동화 불가 — 직접 진행):

1. https://github.com/settings/personal-access-tokens/new 접속
2. Token name: "{{GITHUB_REPO}}-sentry-autofix"
3. Expiration: 원하는 기간 (권장: 90일, 만료 전 재발급 필요)
4. Repository access: "Only select repositories" → {{GITHUB_OWNER}}/{{GITHUB_REPO}} 만 선택
   ⚠️ 절대 "All repositories"로 발급하지 말 것 — 이 레포 하나로 권한을 최소화한다
5. Permissions → Repository permissions → "Actions" = "Read and write" 로만 설정
   (다른 권한은 전부 "No access" 유지)
6. 생성된 토큰(github_pat_...) 복사

발급 완료되면 토큰 값을 알려주세요. (터미널에 그대로 붙여넣으면 다음 단계에서 즉시 Secret Manager로
전송하고 화면에는 다시 표시하지 않습니다.)
```

---

## Step 5: 시크릿을 Firebase Secret Manager에 등록

**실행 전 사용자에게 보여줄 명령**:
```bash
firebase functions:secrets:set GITHUB_PAT
```
승인 후 실행 (프롬프트가 뜨면 Step 4에서 받은 토큰 값 입력). 완료 후 값은 다시 출력하지 않는다.

`SENTRY_CLIENT_SECRET`은 Step 7에서 Sentry Internal Integration을 만들면 발급된다 — 그때 등록:
```bash
firebase functions:secrets:set SENTRY_CLIENT_SECRET
```

---

## Step 6: Cloud Function 코드 설치

`templates/firebase/sentry-to-github-function.js`를 읽어 아래 플레이스홀더를 치환한 뒤,
`functions/` 디렉토리 구조에 맞춰 삽입:

| 플레이스홀더 | 치환 값 |
|-------------|--------|
| `[GITHUB_OWNER]` | `{{GITHUB_OWNER}}` |
| `[GITHUB_REPO]` | `{{GITHUB_REPO}}` |
| `[BASE_BRANCH]` | `{{BASE_BRANCH}}` |

삽입 방법 (기존 `functions/index.js` 구조에 따라 택 1):
- `functions/index.js`가 비어있거나 새 프로젝트면: 파일 내용을 그대로 `functions/index.js`에 작성
- 기존 함수가 이미 있으면: `functions/sentryToGithub.js`로 별도 저장 후
  `functions/index.js`에 `exports.sentryToGithub = require("./sentryToGithub").sentryToGithub;` 추가

`functions/package.json`의 `firebase-functions` 버전이 v2 API(`^4.9.0` 이상)인지 확인.
낮으면 사용자에게 업그레이드 필요 여부 안내 후 승인받고 진행.

---

## Step 7: Sentry Internal Integration 생성 (사람 필수 개입)

먼저 함수를 배포해 웹훅 URL을 확보한다. **실행 전 사용자에게 보여줄 명령**:
```bash
firebase deploy --only functions:sentryToGithub
```
배포는 실제 Firebase 프로젝트를 바꾸는 운영 변경이다 — 승인 없이 실행하지 않는다. 배포 후 출력된
함수 URL(`https://<region>-<project>.cloudfunctions.net/sentryToGithub`)을 기록한다.

이어서 아래 안내를 그대로 출력하고 완료까지 대기:

```
🔗 Sentry Internal Integration 생성 (자동화 불가 — 직접 진행):

1. Sentry → Settings → Developer Settings → Custom Integrations → "Create New Integration"
   → Internal Integration 선택
2. Name: "{{GITHUB_REPO}}-autofix"
3. Webhook URL: <위에서 배포한 함수 URL>
4. "Alerts: Send notifications" 활성화 (Alert Rule Action)
5. Permissions: Issue & Event = Read
6. 저장 후 발급되는 Client Secret 복사 → 알려주세요
   (웹훅 서명 검증에 사용 — Secret Manager로만 전송하고 화면에 다시 표시하지 않습니다)

7. Alerts → Create Alert Rule (대상 프로젝트):
   - "When: A new issue is created"
   - (권장 필터) level = error 이상
   - "Then: Send a notification via {{GITHUB_REPO}}-autofix"
```

Client Secret을 받으면 Step 5의 `firebase functions:secrets:set SENTRY_CLIENT_SECRET`을 실행하고,
시크릿 반영을 위해 함수를 한 번 재배포한다 (`firebase deploy --only functions:sentryToGithub` — 승인 후).

---

## Step 8: 검증

실제 에러를 기다릴 필요 없이 워크플로우 자체가 살아있는지 수동 트리거로 확인:

```bash
gh workflow run sentry-autofix.yml \
  --repo {{GITHUB_OWNER}}/{{GITHUB_REPO}} \
  -f issue_id=test-001 \
  -f issue_title="테스트: 설치 검증용 더미 이슈" \
  -f issue_culprit="setup-sentry-autofix 스킬 검증" \
  -f issue_url=""
```

사용자에게 실행 여부를 물어본다 (실제 Claude API 호출·PR 생성까지 이어지므로 비용 발생 가능).
승인 시 실행 후 `gh run watch`로 진행 상황을 안내한다. 건너뛰면 "다음 실제 에러 발생 시 자연히
검증됨"이라고 안내하고 종료.

---

## Step 9: 완료 보고

```
✅ Sentry AutoFix (Ops Loop 모듈) 설치 완료

설치됨:
- .github/workflows/sentry-autofix.yml
- functions/ 내 sentryToGithub (배포됨)
- GitHub Secrets: ANTHROPIC_API_KEY
- Firebase Secret Manager: GITHUB_PAT, SENTRY_CLIENT_SECRET
- Sentry Internal Integration + Alert Rule

동작 방식:
프로덕션 신규 에러 → Sentry Alert → 웹훅(서명 검증) → Firebase Function
→ GitHub Actions workflow_dispatch → Claude 분석·수정(src/ 앱 코드만 허용) → Claude 리뷰 검증(승인 시에만)
→ 시크릿 없는 job에서 lint/typecheck/test 통과 확인 → PR 생성 → 사람이 머지 (하루 실행 상한 있음)

🔐 보안 체크:
- PAT는 이 레포 단일 대상, Actions 읽기/쓰기 권한만 부여됨 (만료일: [Step4에서 설정한 기간])
- 웹훅은 sentry-hook-signature HMAC 검증 — 서명 불일치 요청은 무시됨
- 만료 전 PAT 재발급 필요 — 캘린더에 등록 권장

🔁 Goal Loop 연결:
반복되는 에러 유형이 보이면 @mistake-logger로 knowledge/mistakes/recent.md에도 기록해
같은 실수가 개발 단계에서부터 예방되도록 연결하세요.
```

---

## 실패 시 롤백

중간 단계 실패 시:
1. 이미 등록한 시크릿/배포된 함수 목록 출력
2. 자동 롤백하지 않음 — 사용자에게 선택 제시 (이어서 진행 / 지금까지 것 되돌리기 / 중단)
3. Firebase Function 삭제가 필요하면 `firebase functions:delete sentryToGithub` 명령을 보여주고 승인 후에만 실행
