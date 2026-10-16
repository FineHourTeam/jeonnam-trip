#!/usr/bin/env bash
# PostToolUse(Edit|Write) 훅 — UI 규칙 결정론적 백스톱 (knowledge/rules.md § 디자인·UI)
# 검사 1: 빈 콜백 (onClick={() => {}} 등) — 동작 없는 버튼 금지
# 검사 2: window.alert/confirm/prompt 직접 호출 — components/ui 공용 Dialog만 허용
# 검사 3: 색상 하드코딩 (Tailwind arbitrary hex / inline style hex / 기본 팔레트 bg-red-600 등) — tokens.css 위계만 허용
# 검사 4: fontFamily 직접 지정 / 임의 폰트 클래스 — tokens.css --font-sans가 소유
# 검사 5: 폰트 크기 12px 미만 (text-[..px] / fontSize) — 최소 폰트 크기 12
# 검사 6: dangerouslySetInnerHTML — XSS 벡터, 에스컬레이션 대상
# 검사 7: features 간 직접 import — index.ts 공개 API/shared 경유만 허용
# 검사 8: 간격·라운드·섀도우 arbitrary value (p-[16px] 등) — Tailwind 스케일만 (4px 그리드)
# 검사 9: 한국어 카피 AI 티 (rules.md § 한국어 카피) — 문체 혼용(해요체 프로젝트만)·과잉 경어·"성공적으로"·
#         당신/여러분/혁신적인·변수 뒤 조사 하드코딩. src/**/*.ts(x) + src/locales/**/*.json, 주석 줄·테스트 제외
# 검사 10: 기본 아이콘 팩 import(lucide-react 등)·화면 코드의 인라인 <svg> — 아이콘은 src/components/icons/ 프로젝트 세트만
# 한계: 한 줄 패턴 휴리스틱(여러 줄 표현은 못 잡음) — 1차 방어는 CLAUDE.md/rules.md, 이 훅은 백스톱.
# exit 2 = stderr가 에이전트에게 피드백되어 즉시 수정하게 됨.

INPUT=$(cat)

# stdin JSON에서 file_path 추출 (jq 의존 없이) + 윈도우 역슬래시 정규화
FILE=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 \
  | sed 's/.*:[[:space:]]*"//; s/"$//; s/\\\\/\//g; s/\\/\//g')

[ -z "$FILE" ] && exit 0

IS_LOCALE=0
case "$FILE" in
  */src/*.tsx|*/src/*.ts|*/src/*.jsx|*/src/*.js) ;;
  */src/locales/*.json) IS_LOCALE=1 ;;
  *) exit 0 ;;
esac

[ -f "$FILE" ] || exit 0

IN_STYLES=0; IN_UI=0
case "$FILE" in */src/styles/*) IN_STYLES=1 ;; esac
case "$FILE" in */src/components/ui/*) IN_UI=1 ;; esac
# 테스트 파일은 alert 모킹 등 예외가 많아 검사 2만 면제
IS_TEST=0
case "$FILE" in *.test.*|*.spec.*|*/__tests__/*) IS_TEST=1 ;; esac

ERRS=""
add_err() { ERRS="${ERRS}$1\n$2\n"; }

# ── 검사 1·2: 상호작용 규칙 (공용 래퍼 구현부인 components/ui는 제외) ──
if [ "$IN_UI" -eq 0 ]; then
  if HITS=$(grep -nE 'on[A-Z][a-zA-Z]*=\{[[:space:]]*(async[[:space:]]*)?\([^)]*\)[[:space:]]*=>[[:space:]]*\{[[:space:]]*\}[[:space:]]*\}' "$FILE"); then
    add_err "[UI 규칙 위반] 빈 콜백 발견 — 동작 없는 버튼·클릭 영역 금지 (기능 연결 / 요소 제거 / disabled 명시 중 택 1):" "$HITS"
  fi
  if [ "$IS_TEST" -eq 0 ]; then
    if HITS=$(grep -nE '(^|[^A-Za-z.])(window\.)?(alert|confirm|prompt)[[:space:]]*\(' "$FILE" | grep -vE '//.*'); then
      add_err "[UI 규칙 위반] alert/confirm/prompt 직접 호출 — src/components/ui/의 공용 Dialog/AlertDialog만 사용:" "$HITS"
    fi
  fi
fi

# ── 검사 3·4: 하드코딩 (토큰 정의부 src/styles와 shadcn 원본 코드 src/components/ui는 제외) ──
if [ "$IN_STYLES" -eq 0 ] && [ "$IN_UI" -eq 0 ]; then
  if HITS=$(grep -nE '(text|bg|border|from|to|via|fill|stroke|ring|shadow|outline|decoration|accent|caret)-\[(#|rgb|hsl|oklch)' "$FILE"); then
    add_err "[디자인 토큰 위반] Tailwind arbitrary 색상 — tokens.css 위계(bg-primary 등)에 등록 후 사용 (rules.md § 디자인):" "$HITS"
  fi
  if HITS=$(grep -nE '(^|[^a-z-])(text|bg|border|from|to|via|fill|stroke|ring|outline|decoration|accent|caret|divide|placeholder)-(red|rose|pink|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|slate|gray|zinc|neutral|stone)-(50|[1-9]00|950)([^0-9]|$)' "$FILE"); then
    add_err "[디자인 토큰 위반] Tailwind 기본 팔레트 직접 사용(bg-red-600 등) — tokens.css 시맨틱 토큰(bg-primary·bg-destructive…)을 쓰고, 맞는 게 없으면 용도 토큰을 추가 (rules.md § 팔레트):" "$HITS"
  fi
  if HITS=$(grep -nE '((color|background|backgroundColor|border[A-Za-z]*Color|outlineColor|fill|stroke)[\"'"'"']?[[:space:]]*:[[:space:]]*[\"'"'"']?|(fill|stroke|color)=[\"'"'"'])(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch)' "$FILE"); then
    add_err "[디자인 토큰 위반] inline style 색상 하드코딩 — 색은 src/styles/tokens.css 위계에 등록 후 Tailwind 클래스로 사용:" "$HITS"
  fi
  # 영역 배경 — 회색은 bg-background-subtle(#f9f9f9)만. muted·secondary·accent는 컴포넌트용 (rules.md § 색상 위계 — 배경색)
  if HITS=$(grep -nE '<(main|section|body|header|footer|aside)([[:space:]][^>]*)?className=[^>]*[" ]bg-(muted|secondary|accent)([ "/]|$)' "$FILE"); then
    add_err "[디자인 토큰 위반] 영역 배경에 bg-muted·bg-secondary·bg-accent — 페이지·섹션 배경은 흰색(bg-background) 기본, 회색이 필요하면 bg-background-subtle(#f9f9f9)만:" "$HITS"
  fi
  if HITS=$(grep -nE '(fontFamily[[:space:]]*:|font-\[)' "$FILE"); then
    add_err "[디자인 토큰 위반] fontFamily 직접 지정 — 폰트는 tokens.css --font-sans가 소유:" "$HITS"
  fi
  # ── 검사 8: 간격·라운드·섀도우 arbitrary value — Tailwind 스케일만 (4px 배수 그리드가 일관성의 축) ──
  # 좌측 경계 가드: top-[..] 의 "p-["가 걸리지 않도록 앞 문자가 영숫자/하이픈이면 제외 (-m-[..]은 잡음)
  if HITS=$(grep -nE '(^|[^a-zA-Z0-9-])-?(p|px|py|ps|pe|pt|pb|pl|pr|m|mx|my|ms|me|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|rounded(-[a-z]+)?|shadow)-\[' "$FILE"); then
    add_err "[디자인 토큰 위반] 간격/라운드/섀도우 arbitrary value — Tailwind 스케일(p-4 = 16px)만 사용 (rules.md § 디자인 토큰):" "$HITS"
  fi
fi

# ── 검사 5: 최소 폰트 12px (styles 포함 전체 — 토큰에서도 12 미만 금지) ──
if HITS=$(grep -nE 'text-\[[0-9.]+(px|rem|em)\]' "$FILE"); then
  add_err "[디자인 토큰 위반] 글자 크기 임의값(text-[13px] 등) — Tailwind 스케일(text-xs~)만, 최소 12px(text-xs) (rules.md § 타이포 위계):" "$HITS"
fi
if HITS=$(grep -nE 'fontSize[[:space:]]*:[[:space:]]*[\"'"'"']?(0?[0-9]|1[01])(px)?[\"'"'"']?[[:space:],}]' "$FILE"); then
  add_err "[디자인 토큰 위반] fontSize 12 미만 — 최소 폰트 크기는 12 (rules.md § 디자인):" "$HITS"
fi

# ── 검사 6: dangerouslySetInnerHTML (shadcn chart 등 ui 원본은 제외) ──
if [ "$IN_UI" -eq 0 ] && HITS=$(grep -n 'dangerouslySetInnerHTML' "$FILE"); then
  add_err "[보안 규칙 위반] dangerouslySetInnerHTML — XSS 벡터. DOMPurify sanitize + 에스컬레이션 없이 사용 금지 (rules.md § UI 금지):" "$HITS"
fi

# ── 검사 7: features 간 직접 import ──
case "$FILE" in
  */src/features/*)
    THIS_FEATURE=$(printf '%s' "$FILE" | sed 's|.*/src/features/||' | cut -d/ -f1)
    SRC_ROOT="${FILE%%/src/features/*}/src"
    FILE_DIR=$(dirname "$FILE")
    # import 경로를 실제로 풀어서(상대 경로·@/ 별칭) 다른 feature의 "내부"를 가리키면 위반.
    # 다른 feature의 폴더 자체(= index.ts 공개 API)를 가리키는 import는 허용.
    BAD=""
    while IFS= read -r line; do
      spec=$(printf '%s' "${line#*:}" | sed -nE "s/.*from[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p")
      case "$spec" in
        @/*) target="$SRC_ROOT/${spec#@/}" ;;
        src/*) target="${SRC_ROOT%/src}/$spec" ;;
        .*) target=$(realpath -m "$FILE_DIR/$spec" 2>/dev/null \
              || node -e 'console.log(require("path").resolve(process.argv[1], process.argv[2]))' "$FILE_DIR" "$spec" 2>/dev/null) ;;
        *) continue ;;
      esac
      case "$target" in
        "$SRC_ROOT"/features/*)
          rest="${target#"$SRC_ROOT"/features/}"; feat="${rest%%/*}"
          [ "$feat" = "$THIS_FEATURE" ] && continue
          [ "$rest" = "$feat" ] || [ "$rest" = "$feat/index" ] || BAD="$BAD$line"$'\n'
          ;;
      esac
    done < <(grep -nE "^[[:space:]]*(import|export) .*from[[:space:]]*['\"]" "$FILE")
    if [ -n "$BAD" ]; then
      add_err "[모듈 경계 위반] 다른 feature 내부 직접 import — 그 feature의 index.ts 공개 API(@/features/<이름>) 또는 shared 경유만 (rules.md § 모듈 경계):" "${BAD%$'\n'}"
    fi
    ;;
esac

# ── 검사 10: 아이콘 — 기본 아이콘 팩 금지, 프로젝트 SVG 세트(src/components/icons)만 (rules.md § 아이콘 규칙) ──
ICON_PKGS="lucide-react|lucide|react-icons(/[^'\"]*)?|@heroicons/react(/[^'\"]*)?|@tabler/icons-react|@phosphor-icons/react|phosphor-react|@radix-ui/react-icons|react-feather|@mui/icons-material(/[^'\"]*)?|iconsax-react|@iconify/react|react-bootstrap-icons|@fortawesome/[^'\"]*|@remixicon/react|@hugeicons/react"
if HITS=$(grep -nE "(from|import)[[:space:]]*['\"](${ICON_PKGS})['\"]" "$FILE"); then
  add_err "[아이콘 규칙 위반] 기본 아이콘 팩 사용 — 이 프로젝트는 아이콘을 컨셉에 맞게 새로 그린다. @/components/icons에서 가져오고, 없으면 src/components/icons/README.md 스타일 가이드대로 새로 만든다 (createIcon):" "$HITS"
fi
case "$FILE" in
  */src/components/icons/*|*.test.*|*.spec.*) ;;
  *.tsx|*.jsx)
    if HITS=$(grep -nE '<svg([[:space:]>]|$)' "$FILE"); then
      add_err "[아이콘 규칙 위반] 화면 코드에 인라인 <svg> — 아이콘은 src/components/icons/에 createIcon으로 등록한 뒤 가져다 쓴다 (한 곳에서 스타일 통일):" "$HITS"
    fi
    ;;
esac

# ── 검사 9: 한국어 카피 AI 티 (rules.md § 한국어 카피 — 언어판 블랙리스트) ──
# 주석 줄(//, *, /*)은 제외. 문체 검사는 CLAUDE.md "문체: 해요체" 프로젝트에서만 (합쇼체는 "좋아요" 같은 명사 오탐 때문에 체크리스트).
IS_PROMPT=0
case "$FILE" in */src/lib/ai/prompts/*) IS_PROMPT=1 ;; esac   # AI 프롬프트는 UI 카피가 아니다
if [ "$IS_TEST" -eq 0 ] && [ "$IS_PROMPT" -eq 0 ]; then
  # 주석 줄은 빼고, 줄 안의 /* … */ · {/* … */} 구간도 지운 뒤 검사한다 (주석은 카피가 아니다)
  KO_SRC=$(grep -nvE '^[[:space:]]*(//|\*|/\*|\{/\*)' "$FILE" | sed -E 's#\{?/\*([^*]|\*[^/])*\*/\}?##g')
  SPEECH=$(grep -oE '문체: *(해요체|합쇼체)' CLAUDE.md 2>/dev/null | head -1 | sed 's/문체: *//')
  if [ "$SPEECH" = "해요체" ]; then
    if HITS=$(printf '%s\n' "$KO_SRC" | grep -E '(습|합|됩|입|랍|갑|옵)니다|습니까|십시오|시기 바랍니다'); then
      add_err "[한국어 카피 위반] 해요체 프로젝트에 합쇼체 어미 — 화면마다 다른 어미가 대표적 AI 티. \"저장했어요\"처럼 (rules.md § 한국어 카피 — 문체):" "$HITS"
    fi
  fi
  if HITS=$(printf '%s\n' "$KO_SRC" | grep -E '하실 수|께서|시겠습니까'); then
    add_err "[한국어 카피 위반] 과잉 경어 — 높임은 문장 끝 한 번, 사물 존대 금지 (\"쓸 수 있어요\") (rules.md § 한국어 카피 — 경어):" "$HITS"
  fi
  if HITS=$(printf '%s\n' "$KO_SRC" | grep -E '성공적으로'); then
    add_err "[한국어 카피 위반] \"성공적으로\" — Successfully 직역. 완료 문구는 능동·결과형 (\"사진 3장을 올렸어요\") (rules.md § 한국어 카피 — 완료):" "$HITS"
  fi
  if HITS=$(printf '%s\n' "$KO_SRC" | grep -E '당신|여러분|혁신적인'); then
    add_err "[한국어 카피 위반] 호칭·과장 어휘 — 당신/여러분 대신 {name}님 또는 생략, 혁신적인 같은 최상급·과장 금지 (rules.md § 한국어 카피):" "$HITS"
  fi
  if HITS=$(printf '%s\n' "$KO_SRC" | grep -E '\}(이|가|을|를|은|는|로|으로)([[:space:]"'"'"'.,!?)}<]|$)'); then
    add_err "[한국어 카피 위반] 변수 뒤 조사 하드코딩({{name}}이·\${n}을) — 받침에 따라 틀림. 조사 없는 문장 또는 {{name}}님이 형태로 (rules.md § 한국어 카피 — 변수):" "$HITS"
  fi
fi

if [ -n "$ERRS" ]; then
  # 적중 기록 (날짜 · 파일 · 검사 종류) — @rule-deprecator가 "한 번도 안 걸린 검사·자주 걸리는 검사"를 판단하는 근거.
  # .git 안에 두므로 커밋되지 않는다 (이 머신의 기록만).
  if GD=$(git rev-parse --git-dir 2>/dev/null); then
    KINDS=$(printf '%b' "$ERRS" | grep -oE '^\[[^]]+\]' | sort -u | tr '\n' ' ')
    printf '%s\t%s\t%s\n' "$(date +%F)" "${FILE##*/src/}" "$KINDS" >> "$GD/claude-sensor-hits.log"
  fi
  printf '%b' "$ERRS" >&2
  echo "파일: $FILE — 상세 규칙: knowledge/rules.md § 디자인·UI·한국어 카피" >&2
  exit 2
fi

exit 0
