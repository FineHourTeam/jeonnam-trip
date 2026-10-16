#!/usr/bin/env bash
# Stop 훅 — "완료"라고 말하기 전에 검증 3종(typecheck · lint · test)을 결정론적으로 실행한다.
# 문서(CLAUDE.md)의 "완료 전 검증 필수" 지시만으로는 에이전트가 자주 건너뛴다 — 훅이 대신 돌리고, 실패하면
# 멈추지 못하게(exit 2) 오류 요약을 돌려준다.
# - src/ 변경이 없으면(질문·문서 작업) 아무것도 안 한다.
# - 마지막으로 통과한 상태와 같으면 다시 돌리지 않는다 (지문은 .git 안에 저장 — 커밋되지 않음).
# - 한 번 막은 뒤 다시 멈추려 할 때(stop_hook_active)는 무한 반복을 막으려고 통과시킨다 — 그때도 실패가
#   남아 있으면 에이전트는 완료 보고에 실패를 그대로 적어야 한다 (CLAUDE.md § 작업 방식).
# build는 느려서 여기서 돌리지 않는다 — CI(react-ci.yml)와 배포 전 검사가 맡는다.

INPUT=$(cat)
printf '%s' "$INPUT" | grep -qE '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0

[ -f package.json ] || exit 0
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || exit 0

# src/ 변경 지문 (추적 파일 diff + 새 파일 목록·내용)
FP=$( { git diff HEAD -- src 2>/dev/null; git ls-files --others --exclude-standard -- src 2>/dev/null \
        | while IFS= read -r f; do printf '%s\n' "$f"; cat "$f" 2>/dev/null; done; } | git hash-object --stdin)
EMPTY=$(printf '' | git hash-object --stdin)
[ "$FP" = "$EMPTY" ] && exit 0
STATE="$GIT_DIR/claude-last-verified"
[ -f "$STATE" ] && [ "$(cat "$STATE")" = "$FP" ] && exit 0

has_script() { grep -qE "\"$1\"[[:space:]]*:" package.json; }
FAILS=""
run() { # 이름 명령
  local out
  if ! out=$(eval "$2" 2>&1); then
    # 에이전트가 읽을 만큼만: 오류 줄 위주 최대 25줄
    local brief
    brief=$(printf '%s\n' "$out" | grep -E 'error|Error|FAIL|×|✗|failed' | head -25)
    [ -z "$brief" ] && brief=$(printf '%s\n' "$out" | tail -15)
    FAILS="${FAILS}── $1 실패 ($2)\n${brief}\n"
  fi
}
# 프로젝트의 npm 스크립트를 따른다 (test는 vitest 감시 모드로 멈추지 않게 --run)
if has_script typecheck; then run typecheck "npm run typecheck --silent"; else run typecheck "npx tsc -b --noEmit"; fi
has_script lint && run lint "npm run lint --silent"
has_script test && run test "npm run test --silent -- --run --passWithNoTests"

# 기본 아이콘 팩 — shadcn CLI처럼 편집 훅을 거치지 않고 쓴 파일도 여기서 잡는다 (rules.md § 아이콘 규칙)
ICON_PKGS="lucide-react|lucide|react-icons(/[^'\"]*)?|@heroicons/react(/[^'\"]*)?|@tabler/icons-react|@phosphor-icons/react|phosphor-react|@radix-ui/react-icons|react-feather|@mui/icons-material(/[^'\"]*)?|iconsax-react|@iconify/react|react-bootstrap-icons|@fortawesome/[^'\"]*|@remixicon/react|@hugeicons/react"
ICON_RE="(from|import)[[:space:]]*['\"](${ICON_PKGS})['\"]"
HITS=$( { git grep -nE "$ICON_RE" -- src; git ls-files --others --exclude-standard -- src | xargs -r grep -nHE "$ICON_RE"; } 2>/dev/null)
if [ -n "$HITS" ]; then
  FAILS="${FAILS}── 아이콘 규칙: 기본 아이콘 팩 import — @/components/icons의 프로젝트 아이콘으로 바꾸고, 없으면 src/components/icons/README.md대로 새로 그린다\n$(printf '%s\n' "$HITS" | head -10)\n"
fi

if [ -n "$FAILS" ]; then
  printf '[완료 전 검증 실패] 아래를 고친 뒤 끝내세요. 고칠 수 없으면 완료 보고에 실패 항목과 이유를 그대로 적으세요.\n%b' "$FAILS" >&2
  exit 2
fi
printf '%s' "$FP" > "$STATE"
exit 0
