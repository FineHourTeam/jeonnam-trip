import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube";

describe("youtubeVideoId", () => {
  it.each([
    ["https://youtu.be/68vpY5dh-SA", "68vpY5dh-SA"],
    ["https://youtu.be/68vpY5dh-SA?si=abc&t=30", "68vpY5dh-SA"],
    ["https://www.youtube.com/watch?v=68vpY5dh-SA&list=x", "68vpY5dh-SA"],
    ["https://m.youtube.com/watch?v=68vpY5dh-SA", "68vpY5dh-SA"],
    ["https://youtube.com/shorts/68vpY5dh-SA", "68vpY5dh-SA"],
    ["https://www.youtube.com/embed/68vpY5dh-SA", "68vpY5dh-SA"],
    ["https://www.youtube.com/live/68vpY5dh-SA?feature=share", "68vpY5dh-SA"],
  ])("%s → 영상 id", (url, id) => {
    expect(youtubeVideoId(url)).toBe(id);
  });

  it.each([
    [undefined],
    ["https://www.namdokorea.com/tour/course/view.do?id=1"],
    ["https://www.youtube.com/@choichoi"],
    ["https://www.youtube.com/watch?v=too-short"],
    ["https://evil.example/watch?v=68vpY5dh-SA"],
    ["https://youtube.com.evil.example/watch?v=68vpY5dh-SA"],
    ["javascript:alert(1)//youtu.be/68vpY5dh-SA"],
    ["https://youtu.be/68vpY5dh-SA%22onload"],
  ])("%s → null", (url) => {
    expect(youtubeVideoId(url)).toBeNull();
  });
});

describe("youtubeEmbedUrl", () => {
  it("쿠키 없는 재생 주소를 만든다", () => {
    expect(youtubeEmbedUrl("68vpY5dh-SA")).toBe(
      "https://www.youtube-nocookie.com/embed/68vpY5dh-SA",
    );
  });
});
