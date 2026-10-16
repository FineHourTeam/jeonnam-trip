#!/usr/bin/env bash
# SessionStart 훅 — fine-harness-react-kit 새 버전 알림 (하루 1회 원격 확인, 항상 exit 0)
# 동작: .claude/starter-version(설치된 버전) vs 원격 VERSION. 새 버전이 있으면 stdout으로 안내를 출력하고,
#       그 출력이 세션 컨텍스트에 들어가 에이전트가 사용자에게 "업데이트할지" 한 번 묻게 된다.
# 업데이트 자체는 /update-starter 스킬이 수행한다 (완료 시 변경 내역 링크 + 새로 써볼 수 있는 기능 안내).
# 네트워크 없음·타임아웃·파일 없음 = 조용히 종료. 캐시: .cache/starter-version-check (24시간).
# 저장소가 비공개라 raw URL은 404 — gh CLI(bootstrap A-1 필수)로 읽고, gh가 없을 때만 raw URL(공개 저장소용) 시도.

LOCAL_FILE=".claude/starter-version"
[ -f "$LOCAL_FILE" ] || exit 0
LOCAL=$(tr -d '[:space:]' < "$LOCAL_FILE")
[ -n "$LOCAL" ] || exit 0

REPO="FineHourTeam/fine-harness-react-kit"
REMOTE_URL="https://raw.githubusercontent.com/$REPO/main/VERSION"
NOTES_URL="https://github.com/FineHourTeam/fine-harness-react-kit/blob/main/RELEASE_NOTES.md"
CACHE_DIR=".cache"; CACHE="$CACHE_DIR/starter-version-check"
NOW=$(date +%s); TTL=86400
REMOTE=""

if [ -f "$CACHE" ]; then
  read -r STAMP CACHED < "$CACHE"
  case "$STAMP" in ''|*[!0-9]*) STAMP=0 ;; esac
  [ $((NOW - STAMP)) -lt "$TTL" ] && REMOTE="$CACHED"
fi

if [ -z "$REMOTE" ]; then
  if command -v gh >/dev/null 2>&1; then
    REMOTE=$(timeout 5 gh api -H 'Accept: application/vnd.github.raw' "repos/$REPO/contents/VERSION" 2>/dev/null | tr -d '[:space:]')
  fi
  if [ -z "$REMOTE" ] && command -v curl >/dev/null 2>&1; then
    REMOTE=$(curl -sf --max-time 3 "$REMOTE_URL" 2>/dev/null | tr -d '[:space:]')
  fi
  case "$REMOTE" in ''|*[!0-9.]*) exit 0 ;; esac
  mkdir -p "$CACHE_DIR" 2>/dev/null && printf '%s %s\n' "$NOW" "$REMOTE" > "$CACHE" 2>/dev/null
fi

[ "$REMOTE" = "$LOCAL" ] && exit 0
# 더 큰 버전이 원격일 때만 알림 (sort -V: 1.7.0 < 1.10.0)
NEWEST=$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V | tail -1)
[ "$NEWEST" = "$REMOTE" ] || exit 0

cat <<MSG
🆕 fine-harness-react-kit 새 버전: v$LOCAL → v$REMOTE
   세션 시작 인사에 이 사실을 한 줄로 알리고 "지금 업데이트할까요?"를 한 번만 물어볼 것 (사용자가 다른 작업
   중이면 강요하지 않는다). 업데이트는 /update-starter — 끝나면 무엇이 달라졌고 무엇을 새로 써볼 수 있는지
   링크와 함께 보여준다. 사용자에게 링크는 아래 한 줄 형식으로만 보여준다:
   업데이트 내역 확인하기 > $NOTES_URL
MSG
exit 0
