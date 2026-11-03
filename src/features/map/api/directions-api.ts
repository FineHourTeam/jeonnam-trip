// 자동차 경로 조회 클라이언트 — 같은 오리진의 /api/directions (Cloud Function 프록시)만 호출한다.
// 네이버 Client Secret은 서버에만 있다. 계약 타입: src/shared/domain/routing.ts
import type {
  DirectionsRequestBody,
  DirectionsResponseBody,
  LegRequest,
  LegResult,
} from "@/shared/domain";
import i18n from "@/lib/i18n";

export class DirectionsUnavailableError extends Error {
  constructor(status: number) {
    super(i18n.t("directions.serverError", { ns: "map", status: String(status) }));
    this.name = "DirectionsUnavailableError";
  }
}

export async function fetchDrivingLeg(req: LegRequest, signal?: AbortSignal): Promise<LegResult> {
  const body: DirectionsRequestBody = { legs: [req] };
  const res = await fetch("/api/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new DirectionsUnavailableError(res.status);
  const data = (await res.json()) as DirectionsResponseBody;
  const leg = data.legs[0];
  if (!leg) throw new DirectionsUnavailableError(res.status);
  return leg;
}
