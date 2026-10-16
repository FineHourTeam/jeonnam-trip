# 테스트 계정 규약

> QA·개발·심사 리뷰어가 쓰는 테스트 로그인의 **단일 출처**. 코드는 `src/lib/test-auth.ts`가 소유.

## 요약 (개발/에뮬레이터 전용)

| 종류 | 값 | 비고 |
|------|-----|------|
| 전화번호 | `01011111111` ~ `01099999999` (010 + 8자리 전체) | 인증번호 **123456** |
| 이메일 도메인 | `*@test.local` | 비번 **test123456!** (없으면 자동 생성) |
| 시드 계정 | `admin@test.local` / `user@test.local` / `user2@test.local` | 비번 동일, `npm run seed:test`로 생성 |

## ⚠️ 보안 — 프로덕션 하드 차단

`src/lib/test-auth.ts`는 **`import.meta.env.DEV` AND `VITE_USE_EMULATORS`** 를 둘 다 만족할 때만
동작한다. 프로덕션 빌드(DEV=false)에서는 모든 함수가 즉시 throw한다. **이 이중 가드를 절대 완화하지
말 것** — 고정 OTP(123456)가 실서비스에서 통하면 아무 번호로나 로그인되는 계정 탈취 백도어가 된다.

- 전화 범위 전체를 123456으로 통하게 하는 건 **앱 레벨 바이패스**로만 가능하다. Firebase 콘솔의
  "테스트 전화번호"는 프로젝트당 **10개 상한**이라 8,900만 개 범위를 콘솔로는 못 넣는다.
- 합성 전화 계정은 이메일/비번 유저다 — `auth.currentUser.phoneNumber`는 null, `email`이 채워진다.
  화면이 전화번호를 읽어야 하면 Firestore 프로필에 저장해 쓴다.

## 로그인 UI 배선 (프로젝트에서)

로그인 핸들러에서 테스트 입력이면 실 인증 대신 test-auth로 분기한다:

```tsx
import { isTestPhone, testPhoneSignIn, isTestEmail, testEmailSignIn } from "@/lib/test-auth";

async function onSubmitPhone(phone: string, code: string) {
  if (isTestPhone(phone)) {
    await testPhoneSignIn(phone, code); // dev+에뮬레이터에서만 true
    return;
  }
  // ...실제 signInWithPhoneNumber 흐름
}

async function onSubmitEmail(email: string, password: string) {
  if (isTestEmail(email)) {
    await testEmailSignIn(email, password);
    return;
  }
  // ...실제 signInWithEmailAndPassword 흐름
}
```

`isTestPhone`/`isTestEmail`은 프로덕션에서 항상 false라 실 인증 흐름만 남는다.

## 프로덕션 QA가 필요할 때 (앱스토어 심사 등)

실 프로덕션에서 리뷰어가 로그인해야 하면 (dev 바이패스는 프로덕션에서 안 됨):
1. Firebase 콘솔 → Authentication → Sign-in method → 전화 → "테스트용 전화번호"에 **≤10개** 등록
   (번호 + 고정 코드 쌍). 이건 실 SMS 없이 프로덕션에서도 통한다.
2. 또는 이메일/비번 심사 계정 1개를 실 프로젝트에 만들어 리뷰 노트에 제공.
3. 등록한 번호·계정은 이 파일 하단 "프로덕션 QA 계정" 절에 기록.

## 시드 실행

```bash
firebase emulators:start          # auth 에뮬레이터 기동
npm run seed:test                 # admin/user/user2 @test.local 생성
```

## 프로덕션 QA 계정 (프로젝트에서 채움)

- (없음 — 앱스토어 심사·프로덕션 QA 필요 시 위 절차로 등록 후 여기 기록)
