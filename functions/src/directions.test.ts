import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_LEGS, fetchLeg, parseBody, simplifyPath, toLegResult } from "./directions.js";

const A = { lat: 34.95, lng: 127.49 };
const B = { lat: 34.93, lng: 127.5 };

test("parseBody: 한국 좌표 범위·구간 수 상한만 통과", () => {
  assert.deepEqual(parseBody({ legs: [{ from: A, to: B }] }), [{ from: A, to: B }]);
  assert.equal(parseBody({ legs: [] }), null);
  assert.equal(parseBody({ legs: [{ from: { lat: 0, lng: 0 }, to: B }] }), null);
  assert.equal(
    parseBody({ legs: Array.from({ length: MAX_LEGS + 1 }, () => ({ from: A, to: B })) }),
    null,
  );
  assert.equal(parseBody(null), null);
});

test("toLegResult: 성공은 분 올림·좌표 변환, 같은 지점은 0분, 실패 코드는 이유", () => {
  const ok = toLegResult(
    {
      code: 0,
      route: {
        trafast: [
          {
            summary: { distance: 12345.6, duration: 61_000 },
            path: [
              [127.49, 34.95],
              [127.5, 34.93],
            ],
          },
        ],
      },
    },
    { from: A, to: B },
    "t",
  );
  assert.deepEqual(ok, {
    status: "ok",
    durationMin: 2,
    distanceM: 12346,
    path: [A, B],
    fetchedAt: "t",
  });
  assert.equal(toLegResult({ code: 1 }, { from: A, to: A }, "t").status, "ok");
  const failed = toLegResult({ code: 3 }, { from: A, to: B }, "t");
  assert.equal(failed.status, "failed");
});

test("simplifyPath: 상한 이하로 줄이고 끝점은 유지", () => {
  const path = Array.from({ length: 1000 }, (_, i): [number, number] => [127 + i / 1000, 34]);
  const s = simplifyPath(path, 100);
  assert.ok(s.length <= 101);
  assert.deepEqual(s.at(-1), { lat: 34, lng: 127 + 999 / 1000 });
});

test("fetchLeg: 서버 오류·네트워크 실패는 failed로 돌려준다 (예외를 던지지 않음)", async () => {
  const down = (async () => new Response("x", { status: 500 })) as typeof fetch;
  assert.equal(
    (await fetchLeg({ from: A, to: B }, { id: "i", secret: "s" }, down)).status,
    "failed",
  );
  const boom = (async () => {
    throw new Error("net");
  }) as typeof fetch;
  assert.equal(
    (await fetchLeg({ from: A, to: B }, { id: "i", secret: "s" }, boom)).status,
    "failed",
  );
});
