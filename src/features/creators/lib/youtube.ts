// 코스 원문이 유튜브 영상이면 상세 화면에 영상을 넣는다 — 원문 주소에서 영상 id만 꺼내 재생 주소를 만든다.
// 운영자가 넣은 주소라도 그대로 iframe에 넣지 않는다: 유튜브 도메인과 11자 영상 id 형식일 때만 재생 주소를 만든다.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
/** /shorts/<id> · /embed/<id> · /live/<id> · /v/<id> */
const PATH_ID = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/;

/** 유튜브 영상 주소면 영상 id, 아니면 null */
export function youtubeVideoId(url: string | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  let id: string | null | undefined = null;
  if (u.hostname === "youtu.be") id = u.pathname.split("/")[1];
  else if (YOUTUBE_HOSTS.includes(u.hostname)) {
    id = u.pathname === "/watch" ? u.searchParams.get("v") : PATH_ID.exec(u.pathname)?.[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** 쿠키를 남기지 않는 유튜브 재생 주소 (youtube-nocookie) */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
