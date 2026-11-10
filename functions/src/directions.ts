// 네이버 Directions 5 (driving) 프록시 — 요청 검증, 구간별 호출, 응답 변환.
// 계약 사본: src/shared/domain/routing.ts 와 같은 모양을 유지한다 (functions는 앱 tsconfig 밖이라 직접 import하지 않는다).

import { logger } from "firebase-functions/logger";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LegRequest {
  from: LatLng;
  to: LatLng;
  departAt?: string;
}

export type LegResult =
  | { status: "ok"; durationMin: number; distanceM: number; path: LatLng[]; fetchedAt: string }
  | { status: "failed"; reason: string };

export interface DirectionsRequestBody {
  legs: LegRequest[];
}

export interface DirectionsResponseBody {
  legs: LegResult[];
}

export interface NaverCredentials {
  clientId: string;
  clientSecret: string;
}

export const MAX_LEGS = 30;
export const MAX_BODY_BYTES = 16 * 1024;
const NAVER_TIMEOUT_MS = 8000;
// ponytail: 고정 동시 호출 수, 네이버 QPS 한도에 걸리면 낮추거나 큐로 바꾼다
const CONCURRENCY = 5;
const NAVER_DRIVING_URL = "https://maps.apigw.ntruss.com/map-direction/v1/driving";

// 네이버 지도 서비스 범위(대한민국) 대략 경계 — 이 밖의 좌표는 잘못된 입력으로 본다
const BOUNDS = { minLat: 32, maxLat: 39.5, minLng: 124, maxLng: 132 };

const REASON = {
  offRoad: "출발지나 도착지가 도로에서 멀어 경로를 찾지 못했어요. 장소 위치를 확인해 주세요.",
  noRoute: "자동차로 갈 수 있는 경로를 찾지 못했어요. 다른 장소로 바꿔 보세요.",
  tooFar: "거리가 너무 멀어 경로를 찾지 못했어요. 가까운 장소로 바꿔 보세요.",
  timeout: "경로 조회가 오래 걸려 멈췄어요. 잠시 후 다시 시도해 주세요.",
  unavailable: "경로를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export class BadRequestError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseLatLng(v: unknown, field: string): LatLng {
  if (!isRecord(v)) throw new BadRequestError(`${field} 좌표가 없어요.`);
  const { lat, lng } = v;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new BadRequestError(`${field} 좌표는 숫자여야 해요.`);
  }
  if (!(
    lat >= BOUNDS.minLat &&
    lat <= BOUNDS.maxLat &&
    lng >= BOUNDS.minLng &&
    lng <= BOUNDS.maxLng
  )) {
    throw new BadRequestError(`${field} 좌표가 국내 범위를 벗어났어요.`);
  }
  return { lat, lng };
}

/** 본문을 계약 모양으로 좁힌다. 잘못된 입력은 BadRequestError (400). */
export function parseDirectionsBody(body: unknown): DirectionsRequestBody {
  if (!isRecord(body) || !Array.isArray(body.legs)) {
    throw new BadRequestError("legs 배열이 필요해요.");
  }
  if (body.legs.length === 0 || body.legs.length > MAX_LEGS) {
    throw new BadRequestError(`구간은 1~${String(MAX_LEGS)}개까지 조회할 수 있어요.`);
  }
  const legs = body.legs.map((leg: unknown, i): LegRequest => {
    if (!isRecord(leg)) throw new BadRequestError(`${String(i + 1)}번째 구간이 비어 있어요.`);
    const parsed: LegRequest = {
      from: parseLatLng(leg.from, `${String(i + 1)}번째 구간 출발지`),
      to: parseLatLng(leg.to, `${String(i + 1)}번째 구간 도착지`),
    };
    if (typeof leg.departAt === "string") parsed.departAt = leg.departAt;
    return parsed;
  });
  return { legs };
}

/**
 * 네이버 응답(JSON) → LegResult. 네이버 path는 [lng, lat] 배열, duration은 ms.
 * code: 0 성공 · 1 출발지=도착지 · 2 도로 주변 아님 · 3 자동차 경로 없음 · 5 1,500km 이상
 */
export function toLegResult(json: unknown, leg: LegRequest, now: Date): LegResult {
  const fetchedAt = now.toISOString();
  if (!isRecord(json)) return { status: "failed", reason: REASON.unavailable };
  switch (json.code) {
    case 0:
      break;
    case 1:
      return { status: "ok", durationMin: 0, distanceM: 0, path: [leg.from, leg.to], fetchedAt };
    case 2:
      return { status: "failed", reason: REASON.offRoad };
    case 3:
      return { status: "failed", reason: REASON.noRoute };
    case 5:
      return { status: "failed", reason: REASON.tooFar };
    default:
      return { status: "failed", reason: REASON.unavailable };
  }
  const route =
    isRecord(json.route) && Array.isArray(json.route.traoptimal)
      ? json.route.traoptimal[0]
      : undefined;
  const summary = isRecord(route) && isRecord(route.summary) ? route.summary : undefined;
  if (
    !isRecord(route) ||
    !summary ||
    typeof summary.duration !== "number" ||
    typeof summary.distance !== "number"
  ) {
    return { status: "failed", reason: REASON.unavailable };
  }
  const path = Array.isArray(route.path)
    ? route.path.flatMap((p: unknown) =>
        Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number"
          ? [{ lat: p[1], lng: p[0] }]
          : [],
      )
    : [];
  return {
    status: "ok",
    durationMin: Math.ceil(summary.duration / 60000),
    distanceM: summary.distance,
    path,
    fetchedAt,
  };
}

type FetchFn = typeof fetch;

/** 구간 하나를 조회한다. 어떤 실패도 throw하지 않고 failed 결과로 돌려준다. */
export async function fetchLeg(
  leg: LegRequest,
  creds: NaverCredentials,
  fetchFn: FetchFn = fetch,
): Promise<LegResult> {
  // departAt은 받지 않는다 — Directions 5는 출발 시각 지정이 없어 현재 교통 기반 예상치만 준다
  const url = new URL(NAVER_DRIVING_URL);
  url.searchParams.set("start", `${String(leg.from.lng)},${String(leg.from.lat)}`);
  url.searchParams.set("goal", `${String(leg.to.lng)},${String(leg.to.lat)}`);
  url.searchParams.set("option", "traoptimal");
  try {
    const res = await fetchFn(url, {
      headers: {
        "x-ncp-apigw-api-key-id": creds.clientId,
        "x-ncp-apigw-api-key": creds.clientSecret,
      },
      signal: AbortSignal.timeout(NAVER_TIMEOUT_MS),
    });
    const json: unknown = await res.json().catch(() => null);
    // 실패 결과 코드(1·2·3·5)는 HTTP 400 + { error: { errorCode, code, message } }로 온다
    const result =
      isRecord(json) && isRecord(json.error) && typeof json.error.code === "number"
        ? json.error
        : json;
    if (!res.ok && !(isRecord(result) && typeof result.code === "number")) {
      logger.warn("naver directions http error", res.status, isRecord(json) ? json.error : null);
      return { status: "failed", reason: REASON.unavailable };
    }
    return toLegResult(result, leg, new Date());
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return { status: "failed", reason: REASON.timeout };
    }
    logger.warn("naver directions fetch failed", err instanceof Error ? err.message : err);
    return { status: "failed", reason: REASON.unavailable };
  }
}

export async function getDirections(
  body: DirectionsRequestBody,
  creds: NaverCredentials,
  fetchFn: FetchFn = fetch,
): Promise<DirectionsResponseBody> {
  const legs = new Array<LegResult>(body.legs.length);
  let next = 0;
  const worker = async () => {
    while (next < body.legs.length) {
      const i = next++;
      legs[i] = await fetchLeg(body.legs[i]!, creds, fetchFn);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, body.legs.length) }, worker));
  return { legs };
}
