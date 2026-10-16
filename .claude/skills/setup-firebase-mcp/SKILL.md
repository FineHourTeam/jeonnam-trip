---
name: setup-firebase-mcp
description: 공식 Firebase MCP 서버를 이 프로젝트에 등록한다. Firestore 데이터·보안규칙·Auth 사용자·Functions 로그를 에이전트가 직접 조회할 수 있게 한다.
argument-hint: (인자 없음)
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit
---

# Firebase MCP 서버 등록

> Google 공식 Firebase MCP 서버(`firebase-tools mcp`, 2025-10 GA)를 등록한다. 단순 문서 검색이 아니라
> **실제 프로젝트의 Firestore 데이터·보안규칙·Auth 사용자·Functions 로그를 라이브로 조회**하는 게
> 핵심 가치다. 시크릿·PAT 발급이 필요 없어 가볍다 — `.mcp.json` 파일 하나면 끝난다.
>
> 참고: 신규 설치라면 `bootstrap.md` Step 0.5-I가 같은 등록을 이미 수행했을 수 있다
> (`docs/setup-checklist.md` **M1** 확인). 이 스킬은 설치 때 건너뛰었거나, 등록 제품 범위를
> 나중에 바꾸고 싶을 때 쓴다.

---

## Step 0: 사전 확인

```bash
firebase --version
firebase login:list
firebase use
```
- `firebase` CLI 없으면 `npm install -g firebase-tools` 안내 후 대기.
- 로그인 안 됐으면 `firebase login` 안내 후 대기.
- `firebase use`로 현재 연결된 프로젝트 ID 확인 — 없으면 `firebase use <project-id>` 먼저 실행 요청.

## Step 1: 등록할 제품 범위 확인

사용자에게 질문: **이 프로젝트에서 실제로 쓰는 Firebase 제품은?** (기본 제안: `package.json`의
`firebase` 의존성 + `src/lib/firebase.ts`에서 import하는 서비스 기준으로 자동 제안)

후보: `firestore`, `auth`, `storage`, `functions`, `hosting`, `remoteconfig`, `apphosting`.
안 쓰는 제품까지 전부 등록하면 컨텍스트만 늘어나므로 **실제 사용하는 것만** 스코프.

## Step 2: `.mcp.json` 작성 (프로젝트 루트, 팀과 공유됨)

기존 `.mcp.json`이 있으면 읽어서 다른 서버 설정은 보존한 채 `firebase` 항목만 추가/병합.

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp", "--only", "<선택한 제품, 쉼표구분>"]
    }
  }
}
```

**실행 전 사용자에게 보여줄 파일 내용**을 먼저 출력하고 승인받은 뒤 저장한다 — `.mcp.json`은 커밋되어
팀 전체에 공유되므로 신중히.

## Step 3: 검증

```
📋 .mcp.json에 firebase MCP 서버 등록됨. Claude Code를 재시작(또는 새 세션 시작)하면 아래 도구들이
   보일 것입니다:
   - Firestore 데이터/보안규칙 조회
   - Auth 사용자 조회
   - Functions 로그 조회
   - (선택한 제품에 따라 Storage/Hosting 등)

   재시작 후 "firebase mcp 도구 목록 보여줘"로 확인해주세요.
```

## Step 4: 완료 보고

```
✅ Firebase MCP 서버 등록 완료

등록된 제품: <선택 목록>
파일: .mcp.json (신규 또는 병합)

🔐 참고:
- 이 MCP는 firebase CLI의 현재 로그인 세션 권한을 그대로 씀 — 별도 시크릿 발급 불필요
- 프로젝트 전환 시(firebase use 변경) MCP도 그 프로젝트를 대상으로 동작함
```

## 실패 시

`.mcp.json` 저장 실패나 기존 파일 파싱 실패 시 자동 수정 시도하지 않고 원본 내용을 보여준 뒤 사용자
판단을 기다린다.
