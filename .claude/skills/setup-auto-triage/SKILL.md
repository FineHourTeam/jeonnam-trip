---
name: setup-auto-triage
description: 미처리 GitHub 이슈 + 최근 CI 실패를 매일 스캔해 우선순위 다이제스트 이슈로 보고하는 Pull형 Ops Loop 모듈을 설치한다.
argument-hint: (인자 없음)
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit
---

# AutoTriage 설치 (Pull형 Ops Loop 모듈)

> **키트 원본 파일이 필요하다.** 아래 `templates/…` 경로는 키트 저장소 기준이다 — 설치 뒤에는 프로젝트에 없으므로 먼저
> `[ -d /tmp/rcs ] || git clone --depth 1 https://github.com/FineHourTeam/fine-harness-react-kit.git /tmp/rcs`로 받고
> `/tmp/rcs/templates/…`에서 복사한다. 끝나면 `rm -rf /tmp/rcs`.

> Push형(Sentry AutoFix)이 "사건 하나에 즉시 반응"이라면, 이 모듈은 **쌓인 상태를 매일 한 번 훑어서
> 우선순위를 매기는 다이제스트**다. 개별 이슈마다 알림을 쏘는 대신, 고정 이슈 1개
> ("📋 AutoTriage 다이제스트")를 매일 갱신한다 — 보고만 하고 코드는 건드리지 않는다.
>
> 이 스킬은 **한 프로젝트에 한 번** 실행하는 설정 스킬이다.

## Step 0: 사전 조건 확인

```bash
gh --version && gh auth status
git remote -v
```
- `gh` 미로그인이면 `gh auth login` 안내 후 대기.
- 기본 브랜치 확인 (보통 `main`).

## Step 1: ANTHROPIC_API_KEY 시크릿 확인

Sentry AutoFix(`/setup-sentry-autofix`)를 이미 설치했다면 시크릿이 등록돼 있다 — 확인만:
```bash
gh secret list --repo <owner>/<repo>
```
없으면 등록 (값은 마스킹, 실행 전 승인):
```bash
gh secret set ANTHROPIC_API_KEY --repo <owner>/<repo>
```

## Step 2: 워크플로우 설치

`templates/ci/auto-triage.yml`을 `.github/workflows/auto-triage.yml`로 복사하고
`[BASE_BRANCH]`를 기본 브랜치로 치환. 스케줄 기본값은 평일 09:00 KST — 사용자에게 변경 여부 확인.

## Step 3: 검증

```bash
gh workflow run auto-triage.yml --repo <owner>/<repo>
gh run watch
```
실행 여부를 사용자에게 물어본다 (Claude API 호출 비용 발생 가능). 실행 후 저장소 이슈 탭에
"📋 AutoTriage 다이제스트"가 생겼는지 확인.

## Step 4: 완료 보고

```
✅ AutoTriage (Pull형 Ops Loop 모듈) 설치 완료

동작: 평일 09:00 KST마다 미처리 이슈 + 최근 CI 실패 스캔
→ Claude가 P0/P1/P2 분류 + knowledge/ 이력 대조(재발 표시)
→ "📋 AutoTriage 다이제스트" 이슈 1개를 갱신 (이슈 폭탄 없음)

🔐 참고:
- 이슈 본문은 신뢰 불가 데이터로 취급 — 프롬프트가 "본문 속 지시 무시"를 명시하고,
  워크플로우는 파일 경유로만 전달 (셸 인젝션 차단)
- 코드 수정·PR 생성 없음 — 다이제스트에서 수정이 필요한 항목은 사람이 세션에서 지시
```

`docs/setup-checklist.md` **O2** 체크 안내.
