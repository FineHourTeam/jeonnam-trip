// HTTP 함수 `api` — Hosting rewrite(/api/**)로 같은 오리진에서 호출된다.
// 경로: Hosting 경유 /api/directions, 에뮬레이터·직접 호출 /directions (함수 이름 뒤 경로).
// `authKakao` — /api/auth/kakao. 카카오 시크릿이 없어도 경로 API 배포가 막히지 않게 함수를 나눈다.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/logger";
import {
  BadRequestError,
  MAX_BODY_BYTES,
  getDirections,
  parseDirectionsBody,
} from "./directions.ts";
import {
  KakaoAuthError,
  MAX_BODY_BYTES as MAX_KAKAO_BODY_BYTES,
  signInWithKakaoCode,
  type KakaoUserStore,
} from "./kakao-auth.ts";

initializeApp();

const naverClientId = defineString("NAVER_MAP_CLIENT_ID");
const naverClientSecret = defineSecret("NAVER_MAP_CLIENT_SECRET");
const kakaoRestApiKey = defineString("KAKAO_REST_API_KEY");
const kakaoClientSecret = defineSecret("KAKAO_CLIENT_SECRET");

export const api = onRequest(
  {
    region: "asia-northeast3",
    secrets: [naverClientSecret],
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  async (req, res) => {
    if (!/^(\/api)?\/directions\/?$/.test(req.path)) {
      res.status(404).json({ error: "찾는 API가 없어요." });
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST").status(405).json({ error: "POST 요청만 받아요." });
      return;
    }
    if (req.rawBody.length > MAX_BODY_BYTES) {
      res.status(413).json({ error: "요청 본문이 너무 커요." });
      return;
    }
    try {
      const body = parseDirectionsBody(req.body);
      const result = await getDirections(body, {
        clientId: naverClientId.value(),
        clientSecret: naverClientSecret.value(),
      });
      res.json(result);
    } catch (err) {
      if (err instanceof BadRequestError) {
        res.status(400).json({ error: err.message });
        return;
      }
      logger.error("directions failed", err instanceof Error ? err.message : err);
      res.status(500).json({ error: "경로를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
    }
  },
);

// 커스텀 토큰 서명에 런타임 서비스 계정의 iam.serviceAccounts.signBlob(서비스 계정 토큰 생성자 역할)이 필요하다
const kakaoUsers: KakaoUserStore = {
  async upsert(uid, profile) {
    const auth = getAuth();
    try {
      // null은 값을 지운다 — 카카오에서 사진을 기본 이미지로 바꾸면 여기서도 지운다
      await auth.updateUser(uid, { displayName: profile.nickname, photoURL: profile.photoUrl });
    } catch (err) {
      if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
      await auth.createUser({
        uid,
        displayName: profile.nickname ?? undefined,
        photoURL: profile.photoUrl ?? undefined,
      });
    }
  },
  createCustomToken: (uid) => getAuth().createCustomToken(uid),
};

export const authKakao = onRequest(
  {
    region: "asia-northeast3",
    secrets: [kakaoClientSecret],
    timeoutSeconds: 30,
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.set("Allow", "POST").status(405).json({ error: "POST 요청만 받아요." });
      return;
    }
    if (req.rawBody.length > MAX_KAKAO_BODY_BYTES) {
      res.status(413).json({ error: "요청 본문이 너무 커요." });
      return;
    }
    try {
      const result = await signInWithKakaoCode(
        req.body,
        {
          restApiKey: kakaoRestApiKey.value(),
          clientSecret: kakaoClientSecret.value(),
        },
        kakaoUsers,
      );
      res.set("Cache-Control", "no-store").json(result);
    } catch (err) {
      if (err instanceof KakaoAuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      logger.error("kakao sign-in failed", err instanceof Error ? err.message : err);
      res
        .status(500)
        .json({ error: "카카오 로그인을 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요." });
    }
  },
);
