# 아이콘 세트 (프로젝트 전용 SVG)

이 프로젝트는 **기본 아이콘 팩(lucide-react·react-icons·heroicons 등)을 쓰지 않는다.** 모든 아이콘은 이 폴더에서 제품 컨셉에
맞게 새로 그린다. 다른 서비스와 똑같은 아이콘이 "AI가 만든 기본 화면" 인상을 만들기 때문이다.

- 기본 아이콘 팩 import는 편집 즉시 훅이, shadcn CLI가 쓴 파일은 끝내기 직전 검사가 막는다.
- 화면 코드에 `<svg>`를 직접 쓰지 않는다 — 여기에 아이콘으로 등록하고 가져다 쓴다.
- 다른 아이콘 팩의 path를 복사하지 않는다 (라이선스·컨셉 불일치). 모양은 이 세트의 스타일 가이드로 새로 그린다.

## 스타일 가이드 (설치 때 컨셉으로 정한다 — 바꾸려면 사람 승인)

| 항목 | 값 | 컨셉과의 연결 (왜 이 값인가) |
|---|---|---|
| 제품 컨셉·톤 | 전남 축제·장소 여행 일정 도구 · 깔끔한, 신뢰감 있는, 실용적인 | CLAUDE.md 상단·§ 제품 톤앤매너 |
| 형태 언어 | 단순한 기하 형태 + 둥근 마감 | 시간·이동을 다루는 도구라 정보가 먼저 읽혀야 함 — 장식 없이 또렷하게 |
| 선 두께 | `icon-style.ts` strokeWidth = 1.5 | 깔끔·신뢰 — 얇고 고른 선이 일정표·지도 위에서 덜 시끄럽다 |
| 선 끝·꺾임 | round · round | 여행 서비스의 부드러운 인상을 유지하되 형태는 단순하게 |
| 채움 | 선 | |
| 모서리 반경 | 사각형 모서리 r=2 | |
| 참고 인상 | 잘 정리된 여행 안내 책자의 픽토그램 | |

## 그리드 규칙 (모든 아이콘 공통)

- 24×24 viewBox, 바깥 2px은 비워 둔다 (그리는 영역 20×20). 원형은 지름 20, 정사각형은 18 정도가 같은 크기로 보인다.
- 좌표는 정수 또는 .5 — 16px에서 흐려지지 않게. 선 두께가 홀수 px 계열이면 .5 좌표.
- 한 아이콘은 요소 1~4개. 16px(`size="sm"`)로 줄였을 때 알아볼 수 있어야 한다 — 디테일은 뺀다.
- 색은 `currentColor`만 (hex는 훅이 막는다). 두 톤이 필요하면 `opacity`로.
- 같은 뜻은 하나의 아이콘 — 만들기 전에 아래 목록에서 먼저 찾는다.

## 새 아이콘 만들기

1. 아래 목록에 같은 뜻의 아이콘이 있는지 확인한다.
2. `<뜻>-icon.tsx` 파일에 `createIcon`으로 만든다 — 이름은 모양이 아니라 뜻으로 (`DeleteIcon`, `TrashCanIcon` 아님):
   ```tsx
   import { createIcon } from "./icon";
   export const DeleteIcon = createIcon("DeleteIcon", <>
     <path d="M5 7h14" />
     <path d="M9 7V5h6v2" />
     <path d="M7 7l1 12h8l1-12" />
   </>);
   ```
3. `index.ts`에 export, 이 README 목록 표에 한 줄.
4. 16px·24px로 렌더해 스타일 가이드와 어긋나지 않는지 본다 (가능하면 스크린샷). 기존 아이콘 2~3개와 나란히 놓고 선 두께·크기
   감각이 같은지 확인한다.

## 쓰는 법

```tsx
import { DeleteIcon } from "@/components/icons";
<Button variant="ghost" size="icon" aria-label="메모 삭제"><DeleteIcon /></Button>   // 아이콘만 있는 버튼 → 버튼에 aria-label
<Button><DeleteIcon size="sm" /> 삭제</Button>                                     // 글자가 있으면 아이콘은 장식
<DeleteIcon label="삭제됨" />                                                       // 아이콘 혼자 뜻을 전할 때
```

## 목록

| 아이콘 | 뜻·쓰는 곳 | 만든 날 |
|---|---|---|
| `SuccessIcon` | 작업 완료·성공 토스트 | 2026-10-16 |
| `InfoIcon` | 안내 토스트·도움말 | 2026-10-16 |
| `WarningIcon` | 경고 토스트·충돌 안내 | 2026-10-16 |
| `ErrorIcon` | 오류 토스트·실패 상태 | 2026-10-16 |
| `LoadingIcon` | 처리 중 (animate-spin과 함께) | 2026-10-16 |
| `CloseIcon` | 닫기·제거 | 2026-10-16 |
| `CheckIcon` | 선택됨·확인 | 2026-10-16 |
| `ChevronDownIcon` | 펼치기·드롭다운 | 2026-10-16 |
| `ChevronRightIcon` | 다음·상세로 이동 | 2026-10-16 |
| `AddIcon` | 추가 (장소·일차·코스) | 2026-10-16 |
| `DeleteIcon` | 삭제 | 2026-10-16 |
| `EditIcon` | 편집 | 2026-10-16 |
| `SearchIcon` | 검색 | 2026-10-16 |
| `ChevronLeftIcon` | 이전·뒤로 (달력 등) | 2026-10-16 |
| `ChevronUpIcon` | 접기·위로 (셀렉트 스크롤) | 2026-10-16 |
| `CompassIcon` | 탐색 탭 | 2026-10-17 |
| `BookmarkIcon` | 저장(보관함에 담기) · 보관함 탭 | 2026-10-17 |
| `BookmarkFilledIcon` | 저장됨 상태 | 2026-10-17 |
| `TripIcon` | 내 여행 탭 · 여행 코스 | 2026-10-17 |
| `CalendarIcon` | 날짜 · 달력 | 2026-10-17 |
| `MapIcon` | 지도 보기 | 2026-10-17 |
| `ListIcon` | 목록 보기 | 2026-10-17 |
| `ClockIcon` | 시각 · 체류 · 이동시간 | 2026-10-17 |
| `CarIcon` | 자동차 이동 | 2026-10-17 |
| `PinIcon` | 위치 · 주소 | 2026-10-17 |
| `ShareIcon` | 공유 | 2026-10-17 |
| `LinkIcon` | 링크 · SNS 원문 | 2026-10-17 |
| `ExternalLinkIcon` | 외부 사이트로 이동 | 2026-10-17 |
| `FilterIcon` | 필터 | 2026-10-17 |
| `MoreIcon` | 더보기 메뉴 | 2026-10-17 |
| `LockIcon` | 고정 시각(프로그램) | 2026-10-17 |
| `RefreshIcon` | 다시 불러오기 · 재계산 | 2026-10-17 |
| `UserIcon` | 계정 | 2026-10-17 |
| `LogoutIcon` | 로그아웃 | 2026-10-17 |
| `PhoneIcon` | 전화 문의 | 2026-10-17 |
| `ParkingIcon` | 주차 | 2026-10-17 |
| `GlobeIcon` | 공식 홈페이지 | 2026-10-17 |
| `CopyIcon` | 링크 복사 · 내 코스로 복사 | 2026-10-17 |
| `SwapIcon` | 장소 교체 | 2026-10-17 |
| `FlagIcon` | 꼭 가볼 곳 | 2026-10-17 |
| `FestivalIcon` | 축제 | 2026-10-17 |
| `CafeIcon` | 카페 | 2026-10-17 |
| `RestaurantIcon` | 식당 | 2026-10-17 |
| `ShopIcon` | 상점 | 2026-10-17 |
| `AttractionIcon` | 관광지 | 2026-10-17 |
| `LodgingIcon` | 숙소 | 2026-10-17 |
| `PhotoIcon` | 사진 없음 자리 | 2026-10-17 |
| `NoteIcon` | 개인 메모 | 2026-10-17 |
| `TagIcon` | 태그 | 2026-10-17 |
| `RouteIcon` | 추천 코스 · 동선 | 2026-10-17 |
| `ArrowLeftIcon` | 뒤로 가기 | 2026-10-17 |
| `ArrowRightIcon` | 다음 · 이동 | 2026-10-17 |
| `SettingsIcon` | 일차 설정 | 2026-10-17 |
| `UploadIcon` | 사진 올리기 | 2026-10-17 |
| `EyeIcon` | 미리보기 | 2026-10-17 |
