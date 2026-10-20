// 인증 repository — Firebase Auth·카카오 로그인 호출은 여기서만 (rules.md § Repository).
// 로그인은 카카오·Google 2종(화면설계 S13). 실패는 LoginError(사유)로 바꿔 던진다 — 화면이 사유별 문구를 고른다.
// 카카오는 JavaScript SDK로 카카오 화면에 다녀온 뒤, 서버(/api/auth/kakao)가 인가 코드를 확인해 만든
// Firebase 커스텀 토큰으로 로그인한다 (functions/src/kakao-auth.ts).
import { GoogleAuthProvider, signInWithCustomToken, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { loadKakaoSdk } from "../lib/kakao-sdk";
import { loginFailureOf, type LoginFailure } from "../lib/login";

export class LoginError extends Error {
  readonly reason: LoginFailure;

  constructor(reason: LoginFailure) {
    super(`로그인 실패: ${reason}`);
    this.name = "LoginError";
    this.reason = reason;
  }
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    throw new LoginError(loginFailureOf(err));
  }
}

/** 카카오 로그인 화면으로 이동한다. 돌아오면 redirectUri(콜백 화면)가 completeKakaoLogin을 부른다 */
export async function startKakaoLogin(input: {
  redirectUri: string;
  state: string;
}): Promise<void> {
  try {
    const sdk = await loadKakaoSdk();
    sdk.Auth.authorize(input);
  } catch {
    throw new LoginError("network");
  }
}

/** 카카오가 돌려준 인가 코드 → 서버가 만든 커스텀 토큰 → Firebase 로그인 */
export async function completeKakaoLogin(input: {
  code: string;
  redirectUri: string;
}): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/auth/kakao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new LoginError("network");
  }
  // 400: 코드 만료·재사용·잘못된 요청 — 다시 로그인하면 된다. 그 밖(404 배포 전, 5xx 설정 오류)은 지금 쓸 수 없음
  if (res.status === 400) throw new LoginError("expired");
  const data: unknown = await res.json().catch(() => null);
  const token =
    typeof data === "object" && data !== null && "customToken" in data ? data.customToken : null;
  if (!res.ok || typeof token !== "string") throw new LoginError("provider-unavailable");
  try {
    await signInWithCustomToken(auth, token);
  } catch (err) {
    throw new LoginError(loginFailureOf(err));
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
