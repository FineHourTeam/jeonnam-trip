# React + Firebase(웹) Unknown Unknowns

`pitfalls.md`는 **이미 겪은** 함정을 기록한다. 이 문서는 반대로 **겪기 전에 미리 아는** 것 —
React+Firebase 프로덕션 웹앱에서 흔히 놓치는 지점의 사전 예방 목록이다. **사람만 수정.**

**전부 읽지 말고 작업 관련 섹션만 로드** (INDEX.md가 경로별로 안내):
Firebase 작업 → #1~13 / 렌더링·훅·UI → #14~26 / 상태관리·라우팅 → #27~38 /
비동기·번들·성능 → #39~46 / 프로덕션 빌드·배포·보안 → #47~58.

---

## Firestore / 데이터 레이어

1. **기본 보안규칙은 아무것도 안 막는다** — 테스트 모드 규칙(`allow read, write: if true`)이 그대로
   프로덕션에 나가는 사고가 흔하다. 반드시 deny-by-default로 시작하고 에뮬레이터 rules 테스트로 검증.
2. **Admin SDK/백엔드는 보안규칙을 완전히 무시한다** — 규칙은 클라이언트 SDK만 막는다. Cloud
   Functions가 Admin SDK로 접근하면 규칙과 무관하게 전부 열려 있다는 걸 코드리뷰 때 잊기 쉽다.
3. **웹 오프라인 캐시는 기본 OFF고, 켜도 "이미 읽은 것"만 들고 있다** — 모바일 SDK와 달리 웹은
   `persistentLocalCache`를 명시해야 캐시가 생기고, 멀티탭이면 `persistentMultipleTabManager`까지
   지정해야 탭 간 충돌이 없다.
4. **쿼리/인덱스 한계는 데이터가 쌓인 뒤에야 드러난다** — 테스트 데이터 몇 천 건으로는 멀쩡하다가
   실사용에서 복합 쿼리 제약·인덱스 누락 에러가 터진다. 처음부터 비정규화 전략을 염두에 둘 것.
5. **Firestore 비용은 저장 용량이 아니라 읽기 "횟수"가 좌우한다** — limit 없는 목록 쿼리, 리렌더마다
   재구독하는 onSnapshot 버그 하나가 무료 5만 건/일을 순식간에 태운다.
6. **onSnapshot 구독은 GC가 회수 안 한다** — useEffect cleanup에서 unsubscribe 누락 시 화면을
   떠나도 구독이 계속 살아 읽기 비용+메모리 누수. StrictMode(마운트 2회)에서 이중 구독으로 먼저
   드러나는 경우가 많다 — cleanup이 정상이면 StrictMode가 무해하다는 뜻.
7. **serverTimestamp()는 로컬에서 잠깐 null이다** — 쓰기 직후 낙관적 스냅샷에서 해당 필드가 null로
   내려와 정렬·표시가 순간 깨진다. `snapshotOptions: { serverTimestamps: 'estimate' }` 또는 null 가드.
8. **Timestamp는 Date가 아니다** — Firestore Timestamp 객체를 그대로 JSON 직렬화·날짜 연산하면
   깨진다. api/ 컨버터에서 `.toDate()`로 변환해 앱 타입에는 Date/ISO 문자열만 흘려보낼 것.
9. **문서는 통째로 읽힌다 + 1MB 제한** — 큰 배열·중첩 맵을 한 문서에 계속 쌓으면 읽기 비용과 한도가
   같이 터진다. 수백 개 이상 늘어나는 관계는 배열이 아니라 서브컬렉션.
10. **단조 증가 ID 직접 생성 금지 (hotspotting)** — 타임스탬프 기반 커스텀 문서 ID는 쓰기 부하가
    한 파티션에 몰린다. 자동 ID 사용.
11. **`getDownloadURL`은 read 권한이다** — Storage 업로드는 통과해도 그 직후 getDownloadURL이
    read 규칙에 걸려 permission-denied가 날 수 있다 (Firestore 부모 문서 존재 검증 규칙일 때 순서
    함정 — pitfalls.md 시드 항목 참조).
    - 관련 함정: **다운로드 URL을 `fetch()`/canvas/`<img crossorigin>`으로 쓰면 CORS로 막힌다** —
      `<img src>` 단순 표시는 되지만 픽셀 읽기·fetch는 버킷 CORS(cors.json)가 없으면 실패. 규칙과
      별개 문제(권한 아님)라 헷갈리기 쉽다. 해법·명령어: **docs/CORS.md § 1**. 앱↔Functions CORS는
      Hosting `/api` rewrite나 onCall로 애초에 피하는 게 정석 (docs/CORS.md).
12. **Auth 초기화는 비동기다** — 새로고침 직후 `auth.currentUser`는 null이었다가 잠시 후 복원된다.
    currentUser를 동기로 읽고 분기하면 로그인 상태에서도 로그인 화면이 번쩍인다. 반드시
    `onAuthStateChanged` 기반 "확인 중" 상태를 두고 라우터 가드가 그걸 기다리게 할 것.
13. **여러 로그인 수단을 나중에 연결하면 계정이 중복 생긴다** — 익명/이메일 → Google 연결은 명시적
    account linking 플로우가 필요. 생략하면 제공자별 별도 계정이 생겨 병합이 어렵다.

## React 렌더링·훅·UI

14. **useEffect로 파생 상태를 계산하면 한 프레임 늦은 UI + 무한루프 위험** — 파생값은 렌더 중 계산
    (비싸면 useMemo). Effect는 외부 시스템 동기화 전용이라는 원칙이 2026년에도 1순위 함정.
15. **의존성 배열의 객체·배열·함수는 매 렌더마다 새 참조** — Effect가 매 렌더 실행되거나(무한
    리페치) memo가 무효화된다. 원시값으로 좁히거나 useMemo/useCallback, 이벤트성 로직은
    useEffectEvent(19.2+).
16. **StrictMode는 dev에서 마운트→언마운트→마운트를 일부러 2회 돌린다** — "dev에서만 2번 호출돼요"
    는 버그가 아니라 cleanup 누락 탐지 기능. StrictMode를 끄는 게 아니라 cleanup을 고친다.
17. **index를 key로 쓰면 정렬·필터·삭제에서 상태가 엉뚱한 행에 붙는다** — 입력값·체크박스가
    뒤섞이는데 에러는 없다. 반드시 데이터의 안정적 id를 key로.
18. **조건부 렌더의 `&&` 좌변이 숫자면 0이 화면에 찍힌다** — `items.length && <List/>`는 0을
    렌더한다. `items.length > 0 &&` 또는 삼항.
19. **비제어→제어 입력 전환 경고는 undefined 초기값 때문** — RHF·useState 초기값을 `''`로. 특히
    Firestore에서 비동기로 채우는 폼은 defaultValues를 로딩 후 reset으로 주입.
20. **setState는 비동기 배치 — 직후에 읽으면 이전 값** — 연속 갱신은 함수형 업데이트
    `setCount(c => c+1)`. React 18+는 이벤트 밖(타이머·프로미스)에서도 배치된다.
21. **stale closure: 타이머·구독 콜백 안의 state는 등록 시점 값** — setInterval 안에서 state를 읽고
    갱신하면 영원히 같은 값. 함수형 업데이트 또는 ref/useEffectEvent.
22. **`ref.current`는 렌더 중 읽으면 안 된다** — 커밋 전이라 stale. 이벤트 핸들러·Effect에서만.
23. **레이아웃 측정 후 즉시 그리기는 useLayoutEffect** — useEffect로 위치·크기를 잡으면 한 프레임
    깜빡인다(FOUC). 반대로 무거운 작업을 useLayoutEffect에 넣으면 페인트가 막힌다.
24. **포털 밖 모달 자작 금지 사유: z-index·포커스 트랩·스크롤 잠금·ESC·aria가 전부 수작업** —
    Radix 기반 공용 Dialog가 이걸 다 소유한다. overflow: hidden 잠금 누락으로 배경 스크롤되는
    모달이 자작의 단골 증상.
25. **이미지 크기 미지정 = CLS** — width/height(또는 aspect-ratio) 없는 img는 로드 시 레이아웃을
    민다. LCP 이미지는 `loading="lazy"` 금지 + `fetchpriority="high"`, 목록 썸네일만 lazy.
26. **한글 IME 조합 중 onChange가 조합 중간값을 쏜다** — 검색 자동완성·글자수 제한에서 마지막
    글자가 잘리거나 중복된다. `onCompositionStart/End` 가드 또는 디바운스로 흡수.

## 상태관리 (TanStack Query / Zustand)

27. **서버 데이터를 useState/Zustand에 복사하면 그 순간부터 stale** — 목록에서 수정했는데 상세가
    옛날 값인 버그의 90%. 서버 상태는 Query 캐시가 단일 출처, 컴포넌트는 select로 가공만.
28. **queryKey에 안 넣은 변수는 refetch를 안 일으킨다** — 필터·페이지·uid 등 쿼리에 쓰는 모든
    입력은 key에 포함. 반대로 매 렌더 새 객체를 key에 넣으면 무한 리페치.
29. **enabled 없이 조건부 데이터를 훅으로 감싸면 undefined 파라미터로 즉시 실행된다** — uid가
    아직 null인데 쿼리가 나가 permission-denied. `enabled: !!uid` 필수.
30. **v5에서 isLoading은 "첫 로딩"만** — refetch 중엔 isFetching. 로딩 스피너 조건을 잘못 잡으면
    새로고침마다 전체 화면이 깜빡이거나, 반대로 stale 데이터가 로딩 표시 없이 남는다.
31. **mutation 후 invalidate 누락 = 저장은 됐는데 화면은 그대로** — 관련 queryKey 전부
    invalidateQueries. 낙관적 업데이트를 했다면 onError 롤백 + onSettled invalidate까지 한 세트.
32. **Zustand 스토어 전체 구독(`useStore()`)은 아무 필드가 바뀌어도 리렌더** — 반드시 selector
    (`useStore(s => s.count)`)로 필요한 조각만. selector가 객체를 반환하면 useShallow.
33. **Zustand persist는 스키마 마이그레이션이 없다** — 필드 구조를 바꾸면 기존 사용자
    localStorage와 충돌. version + migrate 옵션을 처음부터 지정.
34. **auth 상태와 Query 캐시는 함께 리셋해야 한다** — 로그아웃 시 `queryClient.clear()` 누락 →
    다음 로그인 사용자에게 이전 사용자 데이터가 캐시에서 번쩍인다 (개인정보 사고).

## 라우팅 (React Router)

35. **가드의 "인증 확인 중" 상태 처리 누락 = 새로고침마다 로그인 리다이렉트** — #12와 한 세트.
    auth 로딩 중엔 스피너를 반환하고, 확정 후에만 Navigate 판단.
36. **location.state는 새로고침·새 탭·직접 URL 진입에서 null** — 상세 화면 식별자는 URL
    파라미터로, 화면이 스스로 재조회. state는 캐시 힌트로만.
37. **SPA 라우트 새로고침 404는 호스팅 rewrite 문제** — dev에선 되는데 배포에서 /detail/3
    새로고침이 404면 firebase.json rewrites(`** → /index.html`) 누락.
38. **라우트 전환은 스크롤·포커스·title을 자동 복원하지 않는다** — ScrollRestoration(또는 전환 시
    scrollTo(0,0)) + document.title 갱신 + 포커스 이동을 공통 레이아웃에서 처리 (a11y·SEO).

## 비동기·번들·성능

39. **fetch·구독의 응답이 언마운트 뒤 도착하면 취소 안 된 setState** — 경쟁 조건으로 이전 검색
    결과가 나중에 덮어쓴다. Query 사용이 기본 해법, 직접 fetch면 AbortController.
40. **await 안 한 프로미스의 에러는 잡을 곳이 없다** — fire-and-forget이 조용히 삼켜진다.
    void 연산자 + 내부 catch를 명시하거나 await.
41. **동기 import 한 줄이 코드 스플리팅을 무효화한다** — 라우트는 lazy인데 그 라우트의 무거운
    라이브러리(차트·에디터)를 상위에서 정적 import하면 초기 번들에 다 들어온다. 번들 분석으로 확인.
42. **barrel 파일(index.ts 재수출)이 트리셰이킹을 방해할 수 있다** — shared 전체를 한 index로
    묶어 재수출하면 한 개 import에 전체가 딸려온다. feature 공개 API용 barrel은 유지하되 shared/
    lib은 개별 경로 import.
43. **긴 동기 작업 하나가 INP를 망친다** — 큰 목록 필터·JSON 파싱을 클릭 핸들러에서 동기로 하면
    입력 반응 200ms 초과. startTransition·가상화(목록 100개 이상은 virtualizer)·Web Worker 검토.
44. **Context value에 매 렌더 새 객체를 넣으면 소비자 전체가 리렌더** — value={{user, setUser}}를
    useMemo 없이 넘기는 패턴. Context는 저빈도 값 전용 + value 메모이제이션.
45. **date 라이브러리·아이콘 전체 import가 번들 상위 단골** — `import * as Icons` 패턴은 수백 KB를 부른다. 프로젝트 아이콘
    세트도 개별 named import(`import { DeleteIcon } from "@/components/icons"`)로 — index.ts는 re-export만 두어 트리셰이킹이 되게.
46. **React Compiler를 켰다면 수동 useMemo/useCallback 추가 전에 컴파일러 적용 여부 먼저 확인** —
    이중 메모이제이션은 이득 없이 코드만 복잡해진다. 컴파일러 규칙 위반(eslint react-hooks v6
    권고)부터 고치는 게 순서.

## 프로덕션 빌드·배포·보안

47. **`VITE_` 접두사 환경변수는 번들에 평문 박제된다** — AI API 키·서버 키를 VITE_로 넣으면 배포
    수 분 내 추출된다. 시크릿은 Cloud Functions/서버에만. Firebase config는 예외(시크릿 아님).
48. **.env를 커밋해도 되는 것과 안 되는 것** — `.env`(공개 가능 기본값)는 커밋 가능,
    `.env.local`·`.env.*.local`(개인·시크릿)은 gitignore. 이 구분이 없으면 팀원 간 설정이 꼬인다.
49. **dev에선 되는데 prod에서 흰 화면 1순위: 런타임 env 누락과 base 경로** — CI에 VITE_ 변수
    미설정 시 undefined로 빌드되고, 서브 경로 배포면 vite base 설정 필요. 배포 전 `npm run build
    && npm run preview`로 프로덕션 번들 실동작 확인.
50. **소스맵 없이 배포하면 프로덕션 에러가 minified 스택으로만 온다** — Sentry Vite 플러그인으로
    빌드 시 소스맵 업로드(+public에서는 제거). 이것 없이는 Ops Loop(에러 자동 수정)의 분석 품질이
    급락한다.
51. **index.html은 no-cache, 해시 에셋은 불변 캐시** — 반대로 설정하면 배포 후에도 사용자가 옛
    번들을 본다. firebase.json headers로 고정 (템플릿 포함).
52. **배포 직후 "동적 import 실패" 에러는 정상 시나리오다** — 배포로 청크 해시가 바뀌면 열려 있던
    탭이 옛 청크를 요청해 실패한다. 동적 import 에러 감지 시 자동 새로고침 처리(에러 바운더리)를
    넣어둘 것.
53. **App Check를 QA/CI 준비 없이 강제하면 우리 팀부터 차단된다** — 디버그 토큰 등록 전에
    enforcement를 켜면 로컬 개발·CI·프리뷰 채널이 먼저 막힌다. 모니터링 모드로 시작.
54. **CSP 없이는 XSS 방어가 반쪽** — firebase.json headers에 CSP 설정, Firebase 서비스 도메인
    (googleapis.com 등)을 connect-src에 허용해야 SDK가 동작한다. 처음부터 넣고 시작할 것 (나중에
    넣으면 인라인 스크립트·서드파티가 줄줄이 걸린다).
55. **사용자 제공 URL의 `javascript:` 스킴을 React는 막지 않는다** — href에 그대로 넣으면 XSS.
    new URL() 파싱 + http/https 화이트리스트. dangerouslySetInnerHTML은 DOMPurify 필수.
56. **Firebase Auth 세션은 기본 local persistence** — 공용 PC 시나리오가 있는 서비스는
    browserSessionPersistence 검토. 또 authorized domains에 preview 채널 도메인(`--*.web.app`)을
    추가하지 않으면 프리뷰에서 로그인이 안 된다.
57. **preview 채널은 무료 플랜 동시 7개 제한 + 만료가 있다** — PR마다 만들면 금방 찬다. expires
    7d 설정 + 닫힌 PR 채널 정리. preview가 프로덕션 Firestore를 바라보지 않게 프로젝트 분리 검토.
58. **npm 공급망 공격은 남 일이 아니다** — lockfile 커밋 필수, CI는 `npm ci`만, Dependabot/Renovate
    로 업데이트를 PR로 받고, GitHub Actions는 SHA 핀 권장. `npm audit`을 CI에 포함.

---

## 참고
- 2026-07 웹 리서치 기반 시드 — 주요 출처: react.dev(Effect 원칙·StrictMode·19.2), TanStack Query
  v5 문서, Zustand v5 문서, Firebase JS SDK v12 릴리스 노트·security checklist·Firestore best
  practices, Vite env 문서·시크릿 유출 사례 보고, Sentry React 가이드, web.dev Core Web Vitals,
  shadcn/ui Tailwind v4 문서.
- 이 목록에 없는 새 함정을 프로젝트에서 실제로 겪으면 이 문서가 아니라 `knowledge/pitfalls.md`
  (사후 기록)에 추가를 **제안**한다(pitfalls.md는 사람만 수정) — 이 문서는 "미리 아는 것"만.
