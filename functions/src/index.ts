// HTTP 함수 `api` — Hosting rewrite(/api/**)로 같은 오리진에서 호출된다.
// 경로: Hosting 경유 /api/directions, 에뮬레이터·직접 호출 /directions (함수 이름 뒤 경로).
import { onRequest } from "firebase-functions/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/logger";
import {
  BadRequestError,
  MAX_BODY_BYTES,
  getDirections,
  parseDirectionsBody,
} from "./directions.ts";

const naverClientId = defineString("NAVER_MAP_CLIENT_ID");
const naverClientSecret = defineSecret("NAVER_MAP_CLIENT_SECRET");

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
