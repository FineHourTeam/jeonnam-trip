// Cloud Functions — POST /api/directions (Hosting rewrite로 같은 오리진). 네이버 Client Secret은 Secret Manager에만 둔다.
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { fetchLeg, parseBody } from "./directions.js";

const NAVER_SECRET = defineSecret("NAVER_MAP_CLIENT_SECRET");
const NAVER_ID = defineString("NAVER_MAP_CLIENT_ID");

export const api = onRequest(
  { region: "asia-northeast3", secrets: [NAVER_SECRET], maxInstances: 10, timeoutSeconds: 30, memory: "256MiB" },
  async (req, res) => {
    // Hosting rewrite는 /api/directions, 에뮬레이터 직접 호출은 /directions로 들어온다
    if (req.path !== "/api/directions" && req.path !== "/directions") {
      res.status(404).json({ error: "not found" });
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }
    const legs = parseBody(req.body);
    if (!legs) {
      res.status(400).json({ error: "invalid legs" });
      return;
    }
    const creds = { id: NAVER_ID.value(), secret: NAVER_SECRET.value() };
    const results = await Promise.all(legs.map((l) => fetchLeg(l, creds)));
    res.set("Cache-Control", "private, no-store");
    res.json({ legs: results });
  },
);
