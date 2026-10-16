---
name: update-starter
description: fine-harness-react-kit(이 프로젝트에 설치된 루프 엔지니어링 스타터킷)를 새 버전으로 업데이트한다. 설치 버전(.claude/starter-version)과 원격 VERSION을 비교해 무엇이 달라졌는지 먼저 보여주고, 사용자 확인 후 파일별 정책(교체/신규만 추가/수동 병합/보존)에 따라 반영하며, 완료 시 버전별 변경 내역 링크와 "새로 써볼 수 있는 것"을 안내한다. 트리거 — "/update-starter", "스타터킷 업데이트", "starter 새 버전 반영", 세션 시작 훅의 🆕 알림.
argument-hint: (인자 없음)
user-invocable: true
allowed-tools: Bash, Read, Write, Edit
---

# /update-starter — 스타터킷 새 버전 반영

원격: `https://github.com/FineHourTeam/fine-harness-react-kit` (main, **비공개** — raw URL은 404이므로 파일 읽기는 `gh api`,
클론은 git 자격증명으로). 사용자에게 보여주는 링크는 **하나뿐**이다:
`업데이트 내역 확인하기 > https://github.com/FineHourTeam/fine-harness-react-kit/blob/main/RELEASE_NOTES.md#{앵커}`
(RELEASE_NOTES는 비전공자용 쉬운 설명이고, 그 문서 상단에 기술 상세 CHANGELOG 링크가 있다. CHANGELOG는 이 스킬이
내부적으로 읽어 반영 절차에 쓰되, 사용자에게 따로 링크하지 않는다.)

## 1. 버전 확인 (읽기만)

```bash
LOCAL=$(tr -d '[:space:]' < .claude/starter-version)
REMOTE=$(gh api -H 'Accept: application/vnd.github.raw' repos/FineHourTeam/fine-harness-react-kit/contents/VERSION | tr -d '[:space:]')
echo "설치: v$LOCAL / 최신: v$REMOTE"
```

- `.claude/starter-version`이 없으면: 이 프로젝트는 v1.7.0 이전 설치본이다. `LOCAL=1.6.1`로 간주하고 진행
  (완료 시 파일을 새로 만든다).
- `LOCAL == REMOTE`면 "이미 최신입니다"로 종료.

## 2. 무엇이 달라지는지 먼저 보여준다 (반영 전)

```bash
gh api -H 'Accept: application/vnd.github.raw' repos/FineHourTeam/fine-harness-react-kit/contents/CHANGELOG.md > "${TMPDIR:-/tmp}/rcs-CHANGELOG.md"
gh api -H 'Accept: application/vnd.github.raw' repos/FineHourTeam/fine-harness-react-kit/contents/RELEASE_NOTES.md > "${TMPDIR:-/tmp}/rcs-RELEASE_NOTES.md"
```

**먼저 쉬운 설명을 보여준다.** RELEASE_NOTES.md는 minor 버전 단위(`## vX.Y (YYYY-MM-DD)`)로 쓰여 있다. LOCAL 초과 ~ REMOTE
이하에 해당하는 minor 항목의 "이번에 한 일 / 이제 가능한 것 / 추가된 스킬"을 **그대로**(요약하거나 기술 용어로 바꾸지 말고)
사용자에게 보여준다. 이 문서는 개발을 모르는 사람이 읽는 것을 전제로 쓰였다.

그다음 기술 상세가 필요하면 CHANGELOG로 넘어간다.

CHANGELOG에서 `## vX.Y.Z (YYYY-MM-DD)` 헤딩 중 **LOCAL 초과 ~ REMOTE 이하** 버전 항목을 전부 읽고,
버전마다 아래 3개 절을 사용자에게 요약해 보여준다(각 절은 CHANGELOG의 고정 소제목이다):

- **달라진 것** — 기존 동작이 어떻게 바뀌는가
- **새로 써볼 수 있는 것** — 새 스킬·규칙·도구가 무엇이고, 언제 어떻게 쓰는가
- **업그레이드 시 할 일** — 사람 손이 필요한 절차 (없으면 "없음")

버전마다 링크를 붙인다. 앵커 규칙(GitHub): 헤딩을 소문자로, `.`·`(`·`)` 제거, 공백은 `-`.
예: `## v1.7.0 (2026-09-22)` → `CHANGELOG.md#v170-2026-09-22`, `## v1.7 (2026-09-23)` → `RELEASE_NOTES.md#v17-2026-09-23`
(RELEASE_NOTES의 날짜는 헤딩을 실제로 읽어서 앵커를 만든다 — 추측하지 않는다.)

**파괴적 변경**이 표시된 버전이 있으면 그 내용을 먼저, 굵게 알린다.

그다음 한 번만 묻는다: **"지금 업데이트할까요? (Y/N)"** — N이면 종료(다음 세션에 훅이 다시 알린다).
"업그레이드 시 할 일"에 사람 개입 항목이 있으면 그것도 이 시점에 함께 알린다.

## 3. 최신본 받기

```bash
RCS="${TMPDIR:-/tmp}/rcs-latest"; rm -rf "$RCS"
git clone --depth 1 https://github.com/FineHourTeam/fine-harness-react-kit.git "$RCS"
```

## 4. 파일별 정책대로 반영 (이 표가 단일 출처)

| 대상 | 정책 | 이유 |
|------|------|------|
| `.claude/agents/*.md` (GOVERNANCE 제외) | **통째로 교체** | 에이전트 프롬프트는 공용 |
| `.claude/agents/GOVERNANCE.md` | 수동 병합 (diff 제시) | 프로젝트 로컬 에이전트·삭제 로그 존재 가능 |
| `.claude/hooks/*.sh` | **통째로 교체** | 검사 로직은 공용. 프로젝트가 검사를 추가했다면(파일 상단 주석에 기록) 수동 병합 |
| `.claude/output-styles/*` | **통째로 교체** | 외부 도구(fluent-korean) 사본 — 프로젝트에서 수정하지 않는 파일 |
| `.claude/skills/<이름>/` | **새 스킬만 추가**, 기존 스킬은 diff 제시 후 교체 여부 확인 | 활성화된 스킬은 시크릿·배포 상태를 갖고 있을 수 있음 |
| `.claude/settings.json` | 수동 병합 (새 hooks·permissions 항목만 추가) | 프로젝트가 permissions를 늘렸을 수 있음 |
| `CLAUDE.md` | 수동 병합 (diff 제시) — 프로젝트 정보(톤·배포·문체) 보존 | 구조 개선만 반영 |
| `knowledge/INDEX.md` · `unknown-unknowns.md` · `pitfalls.md` · `design-system.md` · `packages.md` | 수동 병합 (diff 제시) | 스타터킷 갱신분 + 프로젝트 추가분 공존 |
| `knowledge/rules.md` | **덮어쓰기 금지** — 새 버전에 **새 섹션**이 생겼으면 그 섹션만 append 제안 | 승격된 규칙은 프로젝트 자산 |
| `knowledge/mistakes/` · `docs/questions.md` · `docs/insights.md` | **손대지 않음** | 누적 로그 |
| `docs/setup-checklist.md` | 새 항목만 append (기존 체크 상태 보존) | 연동 현황은 프로젝트 기록 |
| `src/styles/tokens.css` | **덮어쓰기 금지** | 프로젝트 브랜드 토큰 |
| `scripts/check-web-assets.mjs` | **통째로 교체** (없으면 추가 + package.json `prebuild`·`check:web-assets` 스크립트 추가) | 검사 로직은 공용 |
| `templates/react/src/**` · `templates/ci/**` · `templates/firebase/**` | diff만 제시, 반영은 사용자 확인 후 | 이미 치환 복사된 파일 — 재복사 시 프로젝트 값이 덮임 |

"수동 병합"은 diff를 보여주고 **어느 줄을 가져올지 사용자에게 확인**한 뒤 적용한다 — 추측으로 덮어쓰지 않는다.
템플릿의 `{{PLACEHOLDER}}`는 프로젝트 값(CLAUDE.md 상단·docs/setup-checklist.md)으로 채워 넣는다.

## 5. 버전별 "업그레이드 시 할 일" 실행

2단계에서 읽은 각 버전의 "업그레이드 시 할 일"을 오래된 버전부터 순서대로 수행한다.
사람 손이 필요한 항목은 `docs/setup-checklist.md`에 미완료 체크박스로 남긴다.

## 6. 마무리

```bash
cp "$RCS/VERSION" .claude/starter-version
rm -f .cache/starter-version-check
rm -rf "$RCS"
```

`src/` 아래 파일을 바꿨다면 검증 4종(lint·typecheck·test·build)을 돌린다. `.claude/`·`docs/`·`knowledge/`만
바뀌었으면 `bash .claude/hooks/check-ui-rules.sh </dev/null; echo $?`로 훅이 여전히 실행되는지만 확인.
새 훅·settings 변경은 **새 세션부터** 적용된다고 알린다.

## 7. 완료 보고 (이 형식 그대로)

```
✅ fine-harness-react-kit v{LOCAL} → v{REMOTE} 업데이트 완료

업데이트 내역 확인하기 > https://github.com/FineHourTeam/fine-harness-react-kit/blob/main/RELEASE_NOTES.md#{앵커}
  (minor 버전을 여러 개 건너뛰었으면 가장 최신 minor 앵커 하나만 — 문서가 최신순이라 아래로 내려가면 다 보인다)

🆕 새로 써볼 수 있는 것:
- /{스킬 또는 규칙명} — 어떤 기능인지 한 줄 + 언제 쓰는지 한 줄
  (CHANGELOG "새로 써볼 수 있는 것" 절에서 가져온다 — 지어내지 않는다)

🔧 사람 확인이 필요한 것:
- 수동 병합에서 보류한 파일 / 업그레이드 시 할 일 중 미완료 항목 (없으면 "없음")

🔄 새 훅·설정은 새 세션부터 적용됩니다.
```

## 실패 시

clone·gh api 실패(네트워크·gh 미로그인) → 반영 없이 종료하고 `gh auth status` 확인 + 수동 절차 안내(CHANGELOG § 업그레이드 가이드).
반영 도중 실패 → 이미 교체한 파일 목록을 보고하고 `git checkout -- <파일>`로 되돌릴지 묻는다.
`.claude/starter-version`은 **모든 단계가 끝난 뒤에만** 갱신한다 (중간 실패 시 다음 세션에 다시 알림).
