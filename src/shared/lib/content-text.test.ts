import { describe, expect, it } from "vitest";
import { courseText, placeText } from "./content-text";

const place = {
  name: "순천만습지",
  summary: "갈대밭",
  address: "순천시 순천만길 513-25",
  i18n: {
    ko: { name: "순천만습지", summary: "갈대밭", address: "순천시 순천만길 513-25" },
    en: {
      name: "Suncheonman Bay Wetland",
      summary: "Reed fields",
      address: "513-25 Suncheonman-gil",
    },
    ja: { name: "順天湾湿地", summary: "葦原" },
  },
};

describe("placeText", () => {
  it("화면 언어의 번역을 쓰고, 번역이 없는 필드는 원문을 쓴다", () => {
    expect(placeText(place, "en")).toEqual({
      name: "Suncheonman Bay Wetland",
      summary: "Reed fields",
      address: "513-25 Suncheonman-gil",
    });
    expect(placeText(place, "ja").address).toBe("순천시 순천만길 513-25");
    expect(placeText(place, "ko").name).toBe("순천만습지");
  });

  it("원문이 번역 뒤에 바뀐 필드는 원문을 쓴다", () => {
    expect(placeText({ ...place, summary: "갈대밭과 철새" }, "en")).toMatchObject({
      name: "Suncheonman Bay Wetland",
      summary: "갈대밭과 철새",
    });
  });

  it("번역이 없는 장소는 원문 그대로", () => {
    expect(placeText({ name: "가게" }, "ja")).toEqual({
      name: "가게",
      summary: undefined,
      address: undefined,
    });
  });
});

describe("courseText", () => {
  const course = {
    title: "목포 1박2일",
    summary: "바다 보며 걸어요",
    days: [{ day: 1, items: [{ placeId: "a", note: "아침 (영상 0:27)" }, { placeId: "b" }] }],
    i18n: {
      ko: {
        title: "목포 1박2일",
        summary: "바다 보며 걸어요",
        notes: { "d1-0": "아침 (영상 0:27)" },
      },
      en: { title: "Mokpo, 2 Days, 1 Night", notes: { "d1-0": "Breakfast (video 0:27)" } },
    },
  };

  it("제목·메모는 번역을, 번역이 없는 필드·메모는 원문을 쓴다", () => {
    const c = courseText(course, "en");
    expect(c.title).toBe("Mokpo, 2 Days, 1 Night");
    expect(c.summary).toBe("바다 보며 걸어요");
    expect(c.note(1, 0)).toBe("Breakfast (video 0:27)");
    expect(c.note(1, 1)).toBeUndefined();
  });

  it("메모 원문이 바뀌면 원문을 쓴다", () => {
    const edited = { ...course, days: [{ day: 1, items: [{ placeId: "a", note: "점심" }] }] };
    expect(courseText(edited, "en").note(1, 0)).toBe("점심");
  });
});
