# 데이터 구조와 기능 경계

> 인계 산출물 "데이터 구조·설정 설명"의 기준 문서. 타입 단일 출처는 `src/shared/domain/`, 규칙은 `firestore.rules`·`storage.rules`.

## Firestore 컬렉션

| 컬렉션 | 문서 | 읽기 | 쓰기 |
|---|---|---|---|
| `places/{id}` | `Place` | `status == "published"`면 누구나, 관리자는 전부 | 관리자 |
| `festivals/{id}` | `Festival` | 위와 같음 | 관리자 |
| `creatorCourses/{id}` | `CreatorCourse` | 위와 같음 | 관리자 |
| `contentDrafts/{kind}__{id}` | 공개 중 콘텐츠의 수정 초안 | 관리자 | 관리자 |
| `admins/{uid}` | 관리자 명단 | 본인 | 클라이언트 불가 (콘솔·CLI) |
| `trips/{id}` | `Trip` (`ownerUid`, `version`) | 소유자 | 소유자. 생성 `version == 1`, 수정은 `version + 1`만 |
| `shares/{id}` | `SharedTrip` 공개 사본 | `active`면 링크를 아는 누구나 단건 조회, 목록은 소유자 | 소유자 (자기 코스로만 생성) |
| `users/{uid}/savedPlaces/{id}` | `SavedPlace` | 본인 | 본인 |
| `users/{uid}/customPlaces/{id}` | `CustomPlace` | 본인 | 본인 |
| `users/{uid}/snsLinks/{id}` | `SnsLink` | 본인 | 본인 |

- 운영 콘텐츠 목록 쿼리는 반드시 `where("status", "==", "published")`를 포함한다 (규칙이 그 조건 없이는 거부).
- 날짜는 `"YYYY-MM-DD"`(KST 달력), 시각은 `"HH:mm"`, 일시는 ISO 문자열로 저장한다.
- 영업시간 `null` = 미확인(자동 배정 제외), `[]` = 휴무. 좌표 `null` = 미확인(경로 계산 제외).
- 코스에 담을 때 `VisitItem.snapshot`에 이름·위치·영업정보·원본 `updatedAt` 사본을 남긴다. 재열람 시 최신 정보와 비교해 변경·취소를 안내하고, 사용자 확인 없이 일정을 바꾸지 않는다.
- 관리자 지정: Firebase 콘솔 또는 CLI로 `admins/{uid}` 문서를 만든다.

## Storage 경로

- `content/{kind}/{contentId}/{file}`: 운영 콘텐츠 사진. 공개 읽기, 관리자 쓰기 (이미지·10MB 미만)
- `users/{uid}/{...}`: 개인 업로드. 본인만

## 기능 폴더와 공유 모듈

| 위치 | 역할 |
|---|---|
| `src/shared/domain/` | 도메인 타입·컬렉션 이름·시군 목록·경로 조회 계약 |
| `src/shared/lib/date.ts` | KST 날짜·시각 유틸 |
| `src/features/trips/` | 개인 코스 저장소(CRUD·버전 비교), 로그인 전 초안 스토어, "일정에 추가" 조립 함수 |
| `src/features/explore/` | 탐색 홈 (S01) |
| `src/features/festivals/` | 축제 목록·달력·상세 (S02·S03) |
| `src/features/places/` | 장소 목록·상세 (S04·S05) |
| `src/features/library/` | 보관함·SNS 링크 (S06·S07) |
| `src/features/creators/` | 크리에이터 코스 (S08) |
| `src/features/planner/` | 여행 시작·코스 편집·시간 계산 (S09·S10) |
| `src/features/map/` | 네이버 지도 표시·자동차 경로 조회 (MAP) |
| `src/features/account/` | 로그인·내 여행·공유 설정·공개 코스 (S11~S13) |
| `src/features/admin/` | 관리자 (A01~A06) |
| `functions/` | Cloud Functions — `/api/directions` 네이버 Directions 프록시 |

다른 기능의 내부 파일을 직접 import하지 않는다. 다른 기능이 쓸 것은 그 기능의 `index.ts`로만 내보낸다.

## 로컬 개발

```bash
npm run emulators      # auth·firestore·storage 에뮬레이터 (Java 필요)
npm run seed:test      # 테스트 계정 (admin@test.local / user@test.local, 비밀번호 test123456!)
npm run seed:sample    # [샘플] 축제·장소·크리에이터 코스 + admin@test.local 관리자 등록
npm run dev
```

샘플 데이터는 모두 가상이다. 실제 콘텐츠 수집·검증·입력은 발주자 담당이다.
