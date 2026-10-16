#!/usr/bin/env bash
# PreToolUse(Bash) 훅 — 호스팅 배포 직전에 웹 에셋 검사를 강제한다 (knowledge/rules.md § SEO/에셋)
# 대상 명령: firebase deploy (호스팅 포함 시) · firebase hosting:channel:deploy · npm run deploy
# 검사: scripts/check-web-assets.mjs --strict — 파비콘(Google 검색 결과 아이콘)·앱 아이콘·매니페스트·
#       OG 이미지·robots.txt 크롤 허용. 실패하면 배포를 막고(exit 2) 에이전트에게 /generate-web-assets 실행을 지시한다.
# 이유: 파비콘·OG 누락은 배포 후에야 드러나고(검색 결과 지구본 아이콘·공유 미리보기 없음), Google 반영엔 몇 주가 걸린다.
# 스크립트가 없는 프로젝트(React 아님)는 조용히 통과.

INPUT=$(cat)

# stdin JSON의 command 값에서 배포 명령만 골라낸다 (jq 의존 없이)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*' | head -1 | sed 's/.*:[[:space:]]*"//')
[ -z "$CMD" ] && exit 0

IS_DEPLOY=0
case "$CMD" in
  *"hosting:channel:deploy"*) IS_DEPLOY=1 ;;
  *"firebase deploy"*|*"firebase-tools deploy"*)
    # --only가 있는데 hosting이 빠져 있으면(함수·규칙만 배포) 대상 아님
    if printf '%s' "$CMD" | grep -q -- '--only' && ! printf '%s' "$CMD" | grep -q 'hosting'; then
      IS_DEPLOY=0
    else
      IS_DEPLOY=1
    fi ;;
  *"npm run deploy"*|*"pnpm deploy"*|*"yarn deploy"*) IS_DEPLOY=1 ;;
esac
[ "$IS_DEPLOY" = 1 ] || exit 0

[ -f scripts/check-web-assets.mjs ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

OUT=$(node scripts/check-web-assets.mjs --strict 2>&1)
if [ $? -ne 0 ]; then
  {
    echo "⛔ 배포 전 웹 에셋 검사 실패 — 배포를 멈췄습니다."
    printf '%s\n' "$OUT"
    echo "지금 할 일: 위 항목을 /generate-web-assets 로 해결한 뒤(로고 원본이 없으면 사용자에게 요청) 다시 배포하세요."
    echo "검사를 끄거나 우회하지 마세요."
  } >&2
  exit 2
fi
exit 0
