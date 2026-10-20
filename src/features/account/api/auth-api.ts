// 인증 repository — Firebase Auth 호출은 여기서만 (rules.md § Repository).
// 로그인은 Google 1종(화면설계 S13). 실패는 LoginError(사유)로 바꿔 던진다 — 화면이 사유별 문구를 고른다.
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
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

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
