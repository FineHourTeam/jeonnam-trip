---
name: setup-perf-monitor
description: 프로덕션 URL을 주 1회 Lighthouse로 측정해 성능 예산(웹바이탈·번들) 회귀 시 이슈로 보고하는 Pull형 Ops Loop 모듈을 설치한다.
argument-hint: (인자 없음)
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit
---

# 성능 회귀 모니터링 설치 (Pull형 Ops Loop 모듈)

> **키트 원본 파일이 필요하다.** 아래 `templates/…` 경로는 키트 저장소 기준이다 — 설치 뒤에는 프로젝트에 없으므로 먼저
> `[ -d /tmp/rcs ] || git clone --depth 1 https://github.com/FineHourTeam/fine-harness-react-kit.git /tmp/rcs`로 받고
> `/tmp/rcs/templates/…`에서 복사한다. 끝나면 `rm -rf /tmp/rcs`.

> 앱 스토어가 없는 웹에서는 "별점 하락" 대신 **웹바이탈 회귀**가 사용자 불만의 선행 지표다.
> 이 모듈은 주 1회 프로덕션 URL을 Lighthouse(모바일 프로파일, 3회 중앙값)로 측정해
> 성능 예산 위반 시 이슈를 생성/갱신한다 — 보고만 하고 코드는 건드리지 않는다.
>
> 랩 측정 한계: INP는 실사용자 지표라 랩에서는 TBT가 대리 지표. 실사용 INP는 Sentry 성능
> 트레이스(`browserTracingIntegration`)에서 확인 — 이미 lib/sentry.ts에 배선돼 있다.

## Step 0: 사전 조건 확인

- 프로덕션 URL 확정 여부 (Hosting live 채널 또는 커스텀 도메인) — 없으면 "첫 배포 후 실행"
  안내하고 **중단**.
- `gh auth status` 확인.

## Step 1: 예산 파일 설치

`templates/react/lighthouserc.example.json` → 프로젝트 루트 `lighthouserc.json`.
기준값은 `knowledge/rules.md § 빌드/배포 성능 예산`과 동일해야 한다 (한쪽 바꾸면 같이):
- LCP < 2500ms (error) / CLS < 0.1 (error) / TBT < 300ms (error, INP 대리)
- 접근성 점수 ≥ 0.95 (error) / 성능 점수 ≥ 0.85 (warn)

사용자에게 기준 조정 여부 확인 (콘텐츠 헤비 서비스는 total-byte-weight 상향 등).

## Step 2: 워크플로우 설치

`templates/ci/perf-monitor.yml`을 `.github/workflows/perf-monitor.yml`로 복사하고
`[PRODUCTION_URL]`을 실제 URL로 치환. 스케줄 기본 매주 월 07:00 KST — 변경 여부 확인.
측정 대상 페이지를 늘리려면 `urls:`에 핵심 랜딩·목록·상세 URL 추가 (3~5개 권장).

## Step 3: 검증 + 기준선 기록

```bash
gh workflow run perf-monitor.yml
gh run watch
```
첫 실행 결과(각 지표 값)를 `docs/setup-checklist.md` **O3**의 "기준선
YYYY-MM-DD: LCP xxx / CLS x.xx / TBT xxx" 자리에 기록 — 이후 회귀 판단의 비교점.
첫 실행부터 예산 위반이면: 예산을 낮추지 말고 위반 지표를 백로그 이슈로 남긴다 (예산은 목표치).

## Step 4: 완료 보고

```
✅ 성능 회귀 모니터링 (Pull형 Ops Loop 모듈) 설치 완료

동작: 매주 월 07:00 KST에 [PRODUCTION_URL]을 Lighthouse 3회 측정
→ lighthouserc.json 예산 위반 시 "⚠️ 성능 예산 위반 감지" 이슈 생성/갱신
→ 통과하면 조용히 종료 (소음 없음)

기준선: LCP xxx / CLS x.xx / TBT xxx (YYYY-MM-DD)
실사용 INP는 Sentry Performance에서 별도 확인.
```

`docs/setup-checklist.md` **O3** 체크 안내.
