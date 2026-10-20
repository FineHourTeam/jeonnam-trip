// 인증 repository — Firebase Auth 호출은 여기서만 (rules.md § Repository).
// 로그인은 카카오·Google 2종(화면설계 S13). 실패는 LoginError(사유)로 바꿔 던진다 — 화면이 사유별 문구를 고른다.
import {
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LOGIN_PROVIDER_ID, loginFailureOf, type LoginFailure } from "../lib/login";

export class LoginError extends Error {
  readonly reason: LoginFailure;

  constructor(reason: LoginFailure) {
    super(`로그인 실패: ${reason}`);
    this.name = "LoginError";
    this.reason = reason;
  }
}

async function signInWith(provider: AuthProvider) {
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    throw new LoginError(loginFailureOf(err));
  }
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWith(provider);
}

/** 카카오 — Firebase에 OpenID Connect 공급자(oidc.kakao, issuer https://kauth.kakao.com, 코드 흐름)로 연결 */
export async function signInWithKakao(): Promise<void> {
  const provider = new OAuthProvider(LOGIN_PROVIDER_ID.kakao);
  // 카카오는 scope를 넘기면 거기 적은 동의항목만 묻는다 — 닉네임·프로필 사진
  provider.addScope("profile_nickname");
  provider.addScope("profile_image");
  const result = await signInWith(provider);

  // Firebase는 OIDC의 name 클레임만 이름으로 옮기는데 카카오는 nickname으로 준다 — 비어 있으면 채운다.
  // 로그인은 이미 끝났으니 여기서 실패해도 로그인 실패로 보지 않는다 (내 계정 화면은 "이름 없음"으로 보인다)
  const nickname = getAdditionalUserInfo(result)?.profile?.nickname;
  if (!result.user.displayName && typeof nickname === "string" && nickname) {
    await updateProfile(result.user, { displayName: nickname }).catch(() => undefined);
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
