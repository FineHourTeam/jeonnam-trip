// 네이버 Directions 5(자동차) 프록시 로직 — 순수 함수 + fetch 주입. 계약은 앱의 src/shared/domain/routing.ts와 같다.
// 서버에서 외부 API를 부르므로 입력을 좁힌다: 구간 수 상한, 한국 좌표 범위만 (기능명세 §4 외부 요청 제한 원칙).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LegRequest {
  from: LatLng;
  to: LatLng;
}

export type LegResult =
  | { status: "ok"; durationMin: number; distanceM: number; path: LatLng[]; fetchedAt: string }
  | { status: "failed"; reason: string };

export const MAX_LEGS = 30;
const MAX_PATH_POINTS = 200;
const ENDPOINT = "https://maps.apigw.ntruss.com/map-direction/v1/driving";

function isLatLng(v: unknown): v is LatLng {
  if (!v || typeof v !== "object") return false;
  const { lat, lng } = v as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= 33 &&
    lat <= 39 &&
    lng >= 124 &&
    lng <= 132
  );
}

/** 요청 본문 검사 — 맞지 않으면 null (400) */
export function parseBody(body: unknown): LegRequest[] | null {
  const legs = (body as { legs?: unknown } | null)?.legs;
  if (!Array.isArray(legs) || legs.length === 0 || legs.length > MAX_LEGS) return null;
  const out: LegRequest[] = [];
  for (const l of legs) {
    const { from, to } = (l ?? {}) as Record<string, unknown>;
    if (!isLatLng(from) || !isLatLng(to)) return null;
    out.push({ from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng } });
  }
  return out;
}

/** 지도 표시용 경로 좌표를 고르게 솎아 응답 크기를 줄인다 (처음·끝 유지) */
export function simplifyPath(path: [number, number][], max = MAX_PATH_POINTS): LatLng[] {
  const step = Math.max(1, Math.ceil(path.length / max));
  const picked = path.filter((_, i) => i % step === 0 || i === path.length - 1);
  return picked.map(([lng, lat]) => ({ lat, lng }));
}

const FAIL_REASON: Record<number, string> = {
  2: "출발지나 도착지가 도로에서 멀어 경로를 찾지 못했어요.",
  3: "자동차로 갈 수 있는 경로를 찾지 못했어요.",
  5: "경로가 너무 길어요.",
};

interface NaverResponse {
  code?: number;
  route?: {
    trafast?: { summary?: { distance?: number; duration?: number }; path?: [number, number][] }[];
  };
}

/** 네이버 응답 → 앱 구간 결과 */
export function toLegResult(json: NaverResponse, req: LegRequest, now: string): LegResult {
  if (json.code === 1) {
    // 출발지와 도착지가 같다
    return { status: "ok", durationMin: 0, distanceM: 0, path: [req.from, req.to], fetchedAt: now };
  }
  const route = json.route?.trafast?.[0];
  const summary = route?.summary;
  if (
    json.code !== 0 ||
    !summary ||
    typeof summary.duration !== "number" ||
    typeof summary.distance !== "number"
  ) {
    return {
      status: "failed",
      reason: FAIL_REASON[json.code ?? -1] ?? "경로를 불러오지 못했어요.",
    };
  }
  return {
    status: "ok",
    durationMin: Math.ceil(summary.duration / 60_000),
    distanceM: Math.round(summary.distance),
    path: simplifyPath(route.path ?? []),
    fetchedAt: now,
  };
}

export async function fetchLeg(
  req: LegRequest,
  creds: { id: string; secret: string },
  fetchImpl: typeof fetch = fetch,
): Promise<LegResult> {
  const url = `${ENDPOINT}?start=${String(req.from.lng)},${String(req.from.lat)}&goal=${String(req.to.lng)},${String(req.to.lat)}&option=trafast`;
  try {
    const res = await fetchImpl(url, {
      headers: { "x-ncp-apigw-api-key-id": creds.id, "x-ncp-apigw-api-key": creds.secret },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok)
      return {
        status: "failed",
        reason: "경로 서버가 응답하지 않았어요. 잠시 후 다시 시도해 주세요.",
      };
    return toLegResult((await res.json()) as NaverResponse, req, new Date().toISOString());
  } catch {
    return {
      status: "failed",
      reason: "경로 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}
