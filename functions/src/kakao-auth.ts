// 카카오 로그인 → Firebase 커스텀 토큰.
// 브라우저가 카카오 JavaScript SDK(JS 키)로 받은 인가 코드를 넘기면, 같은 앱의 REST API 키·클라이언트 시크릿으로 토큰을 받고
// (/oauth/token) 사용자(/v2/user/me)를 확인한 뒤 uid "kakao:<회원번호>"의 커스텀 토큰을 돌려준다.
// 앱이 쓰는 개인정보는 닉네임뿐이다 — 프로필 사진·이메일은 받아도 저장하지 않는다.
// "JS 키로 인가, REST API 키로 교환"이 카카오 공식 경로다 (developers.kakao.com/docs/ko/kakaologin/js).

import { logger } from "firebase-functions/logger";

/** 인가 요청에 쓴 redirect_uri — 토큰 요청에 같은 값을 보내야 한다(KOE303). 카카오 콘솔에 등록한 주소만 받는다 */
export const KAKAO_REDIRECT_URIS = [
  "https://jeonnam-trip.web.app/auth/kakao/callback",
  "http://localhost:5173/auth/kakao/callback",
];

const TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const USER_URL = "https://kapi.kakao.com/v2/user/me";
const KAKAO_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 4 * 1024;

const MESSAGE = {
  badRequest: "로그인 요청이 올바르지 않아요. 다시 로그인해 주세요.",
  expired: "로그인 정보가 만료됐어요. 다시 로그인해 주세요.",
  unavailable: "카카오 로그인을 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요.",
} as const;

export class KakaoAuthError extends Error {
  readonly status: 400 | 502;

  constructor(status: 400 | 502, message: string) {
    super(message);
    this.status = status;
  }
}

export interface KakaoCredentials {
  restApiKey: string;
  clientSecret: string;
}

export interface KakaoProfile {
  /** 카카오 회원번호 */
  id: string;
  nickname: string | null;
}

export interface KakaoSignInBody {
  code: string;
  redirectUri: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseKakaoBody(body: unknown): KakaoSignInBody {
  if (!isRecord(body)) throw new KakaoAuthError(400, MESSAGE.badRequest);
  const { code, redirectUri } = body;
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{1,512}$/.test(code)) {
    throw new KakaoAuthError(400, MESSAGE.badRequest);
  }
  if (typeof redirectUri !== "string" || !KAKAO_REDIRECT_URIS.includes(redirectUri)) {
    throw new KakaoAuthError(400, MESSAGE.badRequest);
  }
  return { code, redirectUri };
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const data: unknown = await res.json().catch(() => null);
  return isRecord(data) ? data : {};
}

/** 인가 코드 → 액세스 토큰 */
export async function exchangeCode(
  body: KakaoSignInBody,
  creds: KakaoCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: creds.restApiKey,
      client_secret: creds.clientSecret,
      redirect_uri: body.redirectUri,
      code: body.code,
    }),
    signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const code = typeof data.error_code === "string" ? data.error_code : String(res.status);
    // KOE320: 코드 재사용·만료, KOE303: redirect_uri 불일치 — 사용자가 다시 로그인하면 된다
    if (code === "KOE320" || code === "KOE303" || data.error === "invalid_grant") {
      throw new KakaoAuthError(400, MESSAGE.expired);
    }
    // KOE010(시크릿)·KOE101(키) 등은 설정 문제 — 로그에 남기고 사용자에게는 일시 오류로 안내한다
    logger.error("kakao token failed", code, data.error_description);
    throw new KakaoAuthError(502, MESSAGE.unavailable);
  }
  if (typeof data.access_token !== "string") throw new KakaoAuthError(502, MESSAGE.unavailable);
  return data.access_token;
}

/** 액세스 토큰 → 회원번호·닉네임 */
export async function fetchKakaoProfile(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<KakaoProfile> {
  const res = await fetchImpl(USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
  });
  const data = await readJson(res);
  if (!res.ok || (typeof data.id !== "number" && typeof data.id !== "string")) {
    logger.error("kakao user failed", res.status, data.msg ?? data.code);
    throw new KakaoAuthError(502, MESSAGE.unavailable);
  }
  const account = isRecord(data.kakao_account) ? data.kakao_account : {};
  const profile = isRecord(account.profile) ? account.profile : {};
  const nickname =
    typeof profile.nickname === "string" && profile.nickname.trim()
      ? profile.nickname.trim()
      : null;
  return { id: String(data.id), nickname };
}

/** Firebase Admin 쪽 동작 — 테스트에서 바꿔 끼운다 */
export interface KakaoUserStore {
  /** 없으면 만들고, 있으면 이름을 카카오 닉네임으로 맞춘다 */
  upsert(uid: string, profile: KakaoProfile): Promise<void>;
  createCustomToken(uid: string): Promise<string>;
}

export function kakaoUid(profile: KakaoProfile): string {
  return `kakao:${profile.id}`;
}

export async function signInWithKakaoCode(
  rawBody: unknown,
  creds: KakaoCredentials,
  users: KakaoUserStore,
  fetchImpl: typeof fetch = fetch,
): Promise<{ customToken: string }> {
  const body = parseKakaoBody(rawBody);
  const accessToken = await exchangeCode(body, creds, fetchImpl);
  const profile = await fetchKakaoProfile(accessToken, fetchImpl);
  const uid = kakaoUid(profile);
  await users.upsert(uid, profile);
  return { customToken: await users.createCustomToken(uid) };
}
