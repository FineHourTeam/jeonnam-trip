import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestError,
  MAX_LEGS,
  fetchLeg,
  getDirections,
  parseDirectionsBody,
  toLegResult,
  type LegRequest,
} from "./directions.ts";

const leg: LegRequest = { from: { lat: 34.81, lng: 126.39 }, to: { lat: 34.76, lng: 127.66 } };
const creds = { clientId: "id", clientSecret: "secret" };
const now = new Date("2026-10-19T00:00:00.000Z");

const naverOk = {
  code: 0,
  message: "길찾기를 성공하였습니다.",
  route: {
    traoptimal: [
      {
        summary: { distance: 123456, duration: 5_400_001 },
        path: [
          [126.39, 34.81],
          [127.0, 34.8],
          [127.66, 34.76],
        ],
      },
    ],
  },
};

test("성공 응답: ms→분 올림, [lng,lat]→LatLng, fetchedAt", () => {
  assert.deepEqual(toLegResult(naverOk, leg, now), {
    status: "ok",
    durationMin: 91,
    distanceM: 123456,
    path: [
      { lat: 34.81, lng: 126.39 },
      { lat: 34.8, lng: 127.0 },
      { lat: 34.76, lng: 127.66 },
    ],
    fetchedAt: "2026-10-19T00:00:00.000Z",
  });
});

test("출발지=도착지(code 1)는 0분 성공", () => {
  const r = toLegResult({ code: 1 }, leg, now);
  assert.equal(r.status, "ok");
  assert.equal(r.status === "ok" && r.durationMin, 0);
});

test("네이버 실패 코드·깨진 응답은 해요체 사유로 failed", () => {
  for (const json of [
    { code: 2 },
    { code: 3 },
    { code: 5 },
    { code: 99 },
    { code: 0 },
    null,
    "x",
  ]) {
    const r = toLegResult(json, leg, now);
    assert.equal(r.status, "failed");
    assert.match(r.status === "failed" ? r.reason : "", /요\./);
  }
});

const mockFetch = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("fetchLeg: 인증 헤더와 start/goal(lng,lat)을 보낸다", async () => {
  let seen: { url: string; headers: Record<string, string> } | undefined;
  const spy = (async (url: URL, init: RequestInit) => {
    seen = { url: url.toString(), headers: init.headers as Record<string, string> };
    return new Response(JSON.stringify(naverOk));
  }) as unknown as typeof fetch;
  const r = await fetchLeg(leg, creds, spy);
  assert.equal(r.status, "ok");
  assert.match(seen!.url, /start=126\.39%2C34\.81&goal=127\.66%2C34\.76/);
  assert.equal(seen!.headers["x-ncp-apigw-api-key-id"], "id");
  assert.equal(seen!.headers["x-ncp-apigw-api-key"], "secret");
});

test("fetchLeg: HTTP 400에 실린 결과 코드도 변환한다", async () => {
  const same = await fetchLeg(leg, creds, mockFetch(400, { error: { errorCode: 400, code: 1 } }));
  assert.equal(same.status === "ok" && same.durationMin, 0);
  const offRoad = await fetchLeg(
    leg,
    creds,
    mockFetch(400, { error: { errorCode: 400, code: 2 } }),
  );
  assert.match(offRoad.status === "failed" ? offRoad.reason : "", /도로에서 멀어/);
});

test("fetchLeg: HTTP 오류·네트워크 오류·타임아웃은 throw 없이 failed", async () => {
  assert.equal(
    (await fetchLeg(leg, creds, mockFetch(401, { error: { errorCode: "200" } }))).status,
    "failed",
  );
  const boom = (async () => {
    throw new TypeError("network");
  }) as unknown as typeof fetch;
  assert.equal((await fetchLeg(leg, creds, boom)).status, "failed");
  const slow = (async () => {
    throw new DOMException("timeout", "TimeoutError");
  }) as unknown as typeof fetch;
  const r = await fetchLeg(leg, creds, slow);
  assert.match(r.status === "failed" ? r.reason : "", /오래 걸려/);
});

test("getDirections: 구간 순서 유지, 한 구간 실패가 전체를 막지 않는다", async () => {
  let n = 0;
  const flaky = (async () => {
    n++;
    return n === 2 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(naverOk));
  }) as unknown as typeof fetch;
  const res = await getDirections({ legs: [leg, leg, leg] }, creds, flaky);
  assert.deepEqual(
    res.legs.map((l) => l.status),
    ["ok", "failed", "ok"],
  );
});

test("parseDirectionsBody: 정상 입력 통과, departAt 유지", () => {
  const body = parseDirectionsBody({
    legs: [{ ...leg, departAt: "2026-10-20T09:00:00+09:00", extra: 1 }],
  });
  assert.deepEqual(body, { legs: [{ ...leg, departAt: "2026-10-20T09:00:00+09:00" }] });
});

test("parseDirectionsBody: 잘못된 입력은 BadRequestError", () => {
  const tooMany = { legs: Array.from({ length: MAX_LEGS + 1 }, () => leg) };
  for (const bad of [
    null,
    {},
    { legs: [] },
    tooMany,
    { legs: [null] },
    { legs: [{ from: leg.from }] },
    { legs: [{ from: { lat: "34", lng: 126 }, to: leg.to }] },
    { legs: [{ from: { lat: 37.5, lng: 200 }, to: leg.to }] },
    { legs: [{ from: { lat: Number.NaN, lng: 126 }, to: leg.to }] },
  ]) {
    assert.throws(() => parseDirectionsBody(bad), BadRequestError, JSON.stringify(bad));
  }
});
