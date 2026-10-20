import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KAKAO_REDIRECT_URIS,
  KakaoAuthError,
  parseKakaoBody,
  signInWithKakaoCode,
  type KakaoProfile,
  type KakaoUserStore,
} from "./kakao-auth.ts";

const creds = { restApiKey: "rest", clientSecret: "secret" };
const redirectUri = KAKAO_REDIRECT_URIS[0] ?? "";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 토큰·사용자 응답을 차례로 돌려주고, 받은 요청을 기록한다 */
function fakeFetch(...responses: Response[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return next;
  }) as typeof fetch;
  return { impl, calls };
}

function memoryStore() {
  const upserts: { uid: string; profile: KakaoProfile }[] = [];
  const store: KakaoUserStore = {
    upsert: async (uid, profile) => {
      upserts.push({ uid, profile });
    },
    createCustomToken: async (uid) => `token-for-${uid}`,
  };
  return { store, upserts };
}

const userOk = {
  id: 1234567890,
  kakao_account: {
    profile: {
      nickname: " 목포여행 ",
      profile_image_url: "https://k.kakaocdn.net/p.jpg",
      is_default_image: false,
    },
  },
};

test("인가 코드 → 토큰 → 사용자 → uid kakao:<회원번호> 커스텀 토큰", async () => {
  const { impl, calls } = fakeFetch(json(200, { access_token: "at" }), json(200, userOk));
  const { store, upserts } = memoryStore();
  const out = await signInWithKakaoCode({ code: "abc_DEF-1", redirectUri }, creds, store, impl);

  assert.deepEqual(out, { customToken: "token-for-kakao:1234567890" });
  assert.deepEqual(upserts, [
    {
      uid: "kakao:1234567890",
      profile: { id: "1234567890", nickname: "목포여행", photoUrl: "https://k.kakaocdn.net/p.jpg" },
    },
  ]);
  const form = new URLSearchParams(String(calls[0]?.init?.body));
  assert.equal(form.get("client_id"), "rest");
  assert.equal(form.get("client_secret"), "secret");
  assert.equal(form.get("redirect_uri"), redirectUri);
  assert.equal(form.get("code"), "abc_DEF-1");
  assert.match(calls[1]?.url ?? "", /secure_resource=true/);
  assert.deepEqual(calls[1]?.init?.headers, { Authorization: "Bearer at" });
});

test("기본 프로필 사진·빈 닉네임은 null", async () => {
  const user = {
    id: 1,
    kakao_account: {
      profile: { nickname: "", profile_image_url: "https://x", is_default_image: true },
    },
  };
  const { impl } = fakeFetch(json(200, { access_token: "at" }), json(200, user));
  const { store, upserts } = memoryStore();
  await signInWithKakaoCode({ code: "c", redirectUri }, creds, store, impl);
  assert.deepEqual(upserts[0]?.profile, { id: "1", nickname: null, photoUrl: null });
});

test("등록하지 않은 redirect_uri·이상한 코드는 카카오를 부르기 전에 400", async () => {
  const { store } = memoryStore();
  for (const body of [
    { code: "c", redirectUri: "https://evil.example/auth/kakao/callback" },
    { code: "a b", redirectUri },
    { code: "", redirectUri },
    null,
  ]) {
    const { impl, calls } = fakeFetch();
    await assert.rejects(signInWithKakaoCode(body, creds, store, impl), (e: unknown) => {
      return e instanceof KakaoAuthError && e.status === 400;
    });
    assert.equal(calls.length, 0);
  }
  assert.throws(() => parseKakaoBody({ code: "x".repeat(513), redirectUri }), KakaoAuthError);
});

test("만료·재사용 코드(KOE320)는 400 다시 로그인, 설정 오류(KOE010)는 502", async () => {
  const { store } = memoryStore();
  const expired = fakeFetch(json(400, { error: "invalid_grant", error_code: "KOE320" }));
  await assert.rejects(
    signInWithKakaoCode({ code: "c", redirectUri }, creds, store, expired.impl),
    (e: unknown) => e instanceof KakaoAuthError && e.status === 400,
  );
  const badSecret = fakeFetch(json(401, { error: "invalid_client", error_code: "KOE010" }));
  await assert.rejects(
    signInWithKakaoCode({ code: "c", redirectUri }, creds, store, badSecret.impl),
    (e: unknown) => e instanceof KakaoAuthError && e.status === 502,
  );
});

test("사용자 조회 실패(-401)는 502이고 토큰을 만들지 않는다", async () => {
  const { impl } = fakeFetch(
    json(200, { access_token: "at" }),
    json(401, { code: -401, msg: "x" }),
  );
  const { store, upserts } = memoryStore();
  await assert.rejects(
    signInWithKakaoCode({ code: "c", redirectUri }, creds, store, impl),
    (e: unknown) => e instanceof KakaoAuthError && e.status === 502,
  );
  assert.equal(upserts.length, 0);
});
