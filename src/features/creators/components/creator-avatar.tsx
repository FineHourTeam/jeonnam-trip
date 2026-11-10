import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CreatorCourse } from "@/shared/domain";
import { safeHttpUrl } from "@/shared/lib/format";

/** 크리에이터 채널 프로필 사진 — 주소가 없거나 못 불러오면 이름 첫 글자를 보여 준다. 이름이 바로 옆에 있어 사진은 장식이다 */
export function CreatorAvatar({
  creator,
  size,
}: {
  creator: CreatorCourse["creator"];
  size?: "sm" | "default";
}) {
  const src = safeHttpUrl(creator.avatarUrl);
  return (
    <Avatar size={size}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback aria-hidden>{creator.name.trim().slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}
