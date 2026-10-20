import { describe, expect, it } from "vitest";
import type { CustomPlace, Place, SavedPlace, SnsLink } from "@/shared/domain";
import {
  EMPTY_LIBRARY_FILTER,
  filterEntries,
  libraryEntries,
  moodOptions,
  normalizeSnsUrl,
  parseLatLng,
  parseTags,
  snsPlatformOf,
} from "./library";
import { formOfLink, linkInputOf, snsFormSchema } from "./sns-form";

describe("normalizeSnsUrl", () => {
  it("http/https만 받고 javascript: 등은 버린다", () => {
    expect(normalizeSnsUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSnsUrl("ftp://example.com/a")).toBeNull();
    expect(normalizeSnsUrl("그냥 글")).toBeNull();
    expect(normalizeSnsUrl(`https://a.com/${"x".repeat(2000)}`)).toBeNull();
    expect(normalizeSnsUrl("  https://blog.naver.com/abc/123  ")).toBe(
      "https://blog.naver.com/abc/123",
    );
  });

  it("공유 추적 파라미터를 지워 같은 게시물이 같은 주소가 된다", () => {
    expect(normalizeSnsUrl("https://www.instagram.com/reel/C1x/?igsh=abc&utm_source=ig")).toBe(
      "https://www.instagram.com/reel/C1x/",
    );
    expect(normalizeSnsUrl("https://youtu.be/xyz?si=123&t=30")).toBe("https://youtu.be/xyz?t=30");
    // 다른 사이트의 si는 의미가 있을 수 있어 남긴다
    expect(normalizeSnsUrl("https://example.com/p?si=1")).toBe("https://example.com/p?si=1");
  });
});

describe("snsPlatformOf", () => {
  it("주소로 플랫폼을 고른다", () => {
    expect(snsPlatformOf("https://www.instagram.com/p/1/")).toBe("instagram");
    expect(snsPlatformOf("https://m.youtube.com/watch?v=1")).toBe("youtube");
    expect(snsPlatformOf("https://youtu.be/1")).toBe("youtube");
    expect(snsPlatformOf("https://m.blog.naver.com/a/1")).toBe("blog");
    expect(snsPlatformOf("https://abc.tistory.com/3")).toBe("blog");
    expect(snsPlatformOf("https://notinstagram.com/p/1")).toBe("other");
  });
});

describe("parseTags · parseLatLng", () => {
  it("쉼표·#로 나누고 중복을 뺀다", () => {
    expect(parseTags(" 오션뷰, #사진 #오션뷰,, ")).toEqual(["오션뷰", "사진"]);
    expect(parseTags("")).toEqual([]);
  });

  it("국내 좌표만 받는다", () => {
    expect(parseLatLng("34.7936, 126.3886")).toEqual({ lat: 34.7936, lng: 126.3886 });
    expect(parseLatLng("126.3886, 34.7936")).toBeNull();
    expect(parseLatLng("10, 126")).toBeNull();
    expect(parseLatLng("")).toBeNull();
  });
});

const hours = {
  weekly: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  exceptions: [],
};
const place = (id: string, over: Partial<Place> = {}): Place => ({
  id,
  name: `장소 ${id}`,
  sigun: "mokpo",
  category: "cafe",
  moods: ["오션뷰"],
  purposes: [],
  location: { lat: 34.8, lng: 126.4 },
  hours,
  facts: { parking: null, reservation: null, pets: null },
  photos: [],
  sources: [],
  checks: {
    location: { state: "verified" },
    hours: { state: "unverified" },
    info: { state: "verified" },
  },
  status: "published",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});
const saved = (id: string, ref: SavedPlace["ref"], tags: string[] = []): SavedPlace => ({
  id,
  ref,
  tags,
  memo: "",
  savedAt: "2026-10-01T00:00:00.000Z",
});
const custom: CustomPlace = {
  id: "c1",
  name: "골목 국숫집",
  sigun: null,
  category: "restaurant",
  location: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};
const link = (id: string, linked: SnsLink["linked"]): SnsLink => ({
  id,
  url: `https://www.instagram.com/p/${id}/`,
  platform: "instagram",
  linked,
  sigun: null,
  tags: [],
  memo: "",
  createdAt: "2026-10-01T00:00:00.000Z",
});

describe("libraryEntries · filterEntries", () => {
  const entries = libraryEntries(
    [
      saved("p1", { kind: "place", placeId: "p1" }, ["데이트"]),
      saved("p2", { kind: "place", placeId: "p2" }),
      saved("c1", { kind: "custom", customPlaceId: "c1" }, ["국수"]),
      saved("gone", { kind: "place", placeId: "gone" }),
    ],
    [place("p1"), place("p2", { sigun: "yeosu", category: "attraction", moods: [] })],
    [custom],
    [link("l1", [{ kind: "place", placeId: "p1" }]), link("l2", [])],
  );

  it("원본·연결 링크를 붙이고, 공개가 끝난 장소는 place 없이 남긴다", () => {
    expect(entries.map((e) => e.place?.id ?? e.custom?.id ?? null)).toEqual([
      "p1",
      "p2",
      "c1",
      null,
    ]);
    expect(entries[0]?.links.map((l) => l.id)).toEqual(["l1"]);
    expect(entries[0]?.moods).toEqual(["데이트", "오션뷰"]);
    expect(moodOptions(entries)).toEqual(["국수", "데이트", "오션뷰"]);
  });

  it("축끼리는 AND, 같은 묶음 안은 OR이고 모르는 지역·종류는 그 조건에서 빠진다", () => {
    const ids = (f: typeof EMPTY_LIBRARY_FILTER) =>
      filterEntries(entries, f).map((e) => e.saved.id);
    expect(ids(EMPTY_LIBRARY_FILTER)).toEqual(["p1", "p2", "c1", "gone"]);
    expect(ids({ ...EMPTY_LIBRARY_FILTER, sigun: "mokpo" })).toEqual(["p1"]);
    expect(ids({ ...EMPTY_LIBRARY_FILTER, categories: ["cafe", "restaurant"] })).toEqual([
      "p1",
      "c1",
    ]);
    expect(ids({ sigun: "mokpo", categories: ["attraction"], moods: [] })).toEqual([]);
    expect(ids({ ...EMPTY_LIBRARY_FILTER, moods: ["국수", "오션뷰"] })).toEqual(["p1", "c1"]);
  });
});

describe("SNS 폼", () => {
  it("장소 없이도 통과하고 저장 입력으로 바꿀 때 주소·태그를 정리한다", () => {
    const values = {
      url: " https://www.instagram.com/p/1/?igsh=x ",
      places: [],
      sigun: "none",
      tags: "오션뷰, 사진",
      memo: " 메모 ",
    };
    expect(snsFormSchema.safeParse(values).success).toBe(true);
    expect(linkInputOf(values)).toEqual({
      url: "https://www.instagram.com/p/1/",
      sigun: null,
      tags: ["오션뷰", "사진"],
      memo: "메모",
      targets: [],
    });
  });

  it("http(s)가 아닌 주소와 너무 많은 태그를 막는다", () => {
    const base = { places: [], sigun: "none", memo: "" };
    expect(snsFormSchema.safeParse({ ...base, url: "javascript:alert(1)", tags: "" }).success).toBe(
      false,
    );
    const tags = Array.from({ length: 11 }, (_, i) => `t${String(i)}`).join(",");
    expect(snsFormSchema.safeParse({ ...base, url: "https://a.com", tags }).success).toBe(false);
  });

  it("보관한 링크를 편집 폼으로 — 볼 수 없는 장소도 연결은 남긴다", () => {
    const form = formOfLink(
      link("l1", [
        { kind: "place", placeId: "p1" },
        { kind: "custom", customPlaceId: "c1" },
      ]),
      (r) => (r.kind === "custom" ? { name: "골목 국숫집", sigun: null } : null),
    );
    expect(form.places).toEqual([
      { kind: "place", placeId: "p1", name: null, sigun: null },
      { kind: "custom", customPlaceId: "c1", name: "골목 국숫집" },
    ]);
    expect(linkInputOf(form).targets).toEqual([
      { kind: "place", placeId: "p1" },
      { kind: "custom", customPlaceId: "c1" },
    ]);
  });
});
