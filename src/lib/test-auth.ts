// 개발/에뮬레이터 전용 테스트 로그인 — 프로덕션에서는 하드 차단(백도어 방지).
//
// 전화: 010-XXXX-XXXX 전체 범위(01011111111~01099999999)를 인증번호 123456으로 통과.
//   실 SMS 없이 에뮬레이터에 "합성 계정"으로 세션을 만든다. Firebase 콘솔 테스트번호는 프로젝트당
//   10개 상한이라 전체 범위를 콘솔로는 못 넣는다 — 그래서 앱 레벨 바이패스를 쓴다.
// 이메일: @test.local 도메인 + 고정 비번을 dev에서만 통과 (무한정 생성 가능).
//
// ⚠️ 보안: import.meta.env.DEV(=vite dev) AND VITE_USE_EMULATORS 를 **둘 다** 만족할 때만 활성.
//   프로덕션 빌드는 DEV=false라 무조건 비활성 + 함수 호출 시 throw. 이 이중 가드를 절대 완화하지 말 것 —
//   고정 OTP가 실서비스에서 통하면 아무 번호로나 로그인되는 계정 탈취 백도어가 된다.
//
// ⚠️ 합성 전화 계정은 이메일/비번 유저다 — auth.currentUser.phoneNumber는 null이고 email이 채워진다.
//   화면이 전화번호를 직접 읽어야 하면 프로필 문서(Firestore)에 저장해 쓰고, 진짜 phone-user 의미가
//   필요하거나 프로덕션 QA용이면 콘솔 테스트번호(≤10개)를 등록한다. (docs/TEST_ACCOUNTS.md 참조)
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";
import { env } from "./env";

export const TEST_AUTH = {
  phonePattern: /^010\d{8}$/, // 01011111111 ~ 01099999999
  phoneCode: "123456",
  emailDomain: "test.local", // *@test.local
  password: "test123456!", // dev 전용 고정 비번 (프로덕션엔 존재하지 않음)
} as const;

// 프로덕션/실 Firebase에서는 절대 true가 되지 않는다 (DEV + 에뮬레이터 동시 충족만).
export const isTestAuthEnabled = import.meta.env.DEV && env.VITE_USE_EMULATORS;

function assertEnabled(): void {
  if (!isTestAuthEnabled) {
    throw new Error(
      "test-auth는 dev + 에뮬레이터에서만 동작합니다 (프로덕션 백도어 방지). VITE_USE_EMULATORS 확인.",
    );
  }
}

async function signInOrCreate(email: string, password: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      return await createUserWithEmailAndPassword(auth, email, password);
    }
    throw e;
  }
}

/**
 * 010 범위 테스트 번호 로그인 — code는 반드시 123456.
 * 에뮬레이터에 전화번호 기반 합성 계정으로 세션을 만든다 (uid는 번호당 안정적).
 */
export async function testPhoneSignIn(phone: string, code: string): Promise<UserCredential> {
  assertEnabled();
  const digits = phone.replace(/\D/g, "");
  if (!TEST_AUTH.phonePattern.test(digits)) {
    throw new Error(`테스트 전화번호 형식 아님 (010 + 8자리): ${phone}`);
  }
  if (code !== TEST_AUTH.phoneCode) {
    throw new Error(`테스트 인증번호 불일치 (${TEST_AUTH.phoneCode})`);
  }
  const synthetic = `phone-${digits}@${TEST_AUTH.emailDomain}`;
  return signInOrCreate(synthetic, TEST_AUTH.password);
}

/** @test.local 이메일 테스트 로그인 (dev 전용, 없으면 생성). */
export async function testEmailSignIn(
  email: string,
  password: string = TEST_AUTH.password,
): Promise<UserCredential> {
  assertEnabled();
  if (!email.endsWith(`@${TEST_AUTH.emailDomain}`)) {
    throw new Error(`테스트 이메일은 @${TEST_AUTH.emailDomain} 도메인만 허용.`);
  }
  return signInOrCreate(email, password);
}

/** 로그인 핸들러에서 "이 입력이 테스트 계정인가?" 분기용 헬퍼. */
export function isTestPhone(phone: string): boolean {
  return isTestAuthEnabled && TEST_AUTH.phonePattern.test(phone.replace(/\D/g, ""));
}
export function isTestEmail(email: string): boolean {
  return isTestAuthEnabled && email.endsWith(`@${TEST_AUTH.emailDomain}`);
}
