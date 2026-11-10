// 상세 화면 사진 — 한 장씩 밀어 넘기고 오른쪽 아래에 "현재/전체"를 띄운다. 데스크톱에서는 이전·다음 버튼도 보인다.
// 장소 상세(S05)·축제 상세(S03)가 같이 쓴다. 0장이면 대체 문구, 1장이면 그 한 장만 보여 준다.
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface PhotoCarouselProps {
  photos: string[];
  /** n번째(1부터) 사진의 대체 텍스트 */
  alt: (n: number) => string;
  /** 사진이 없을 때 문구 */
  emptyLabel: string;
  /** 사진 출처 표기 */
  credit?: string;
}

const PHOTO = "aspect-video w-full rounded-lg object-cover";

export function PhotoCarousel({ photos, alt, emptyLabel, credit }: PhotoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    onSelect();
    api.on("select", onSelect).on("reInit", onSelect);
    return () => {
      api.off("select", onSelect).off("reInit", onSelect);
    };
  }, [api]);

  if (photos.length === 0) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-1">
      {photos.length === 1 ? (
        <img src={photos[0]} alt={alt(1)} loading="eager" className={PHOTO} />
      ) : (
        <Carousel setApi={setApi}>
          <CarouselContent>
            {photos.map((src, i) => (
              <CarouselItem key={src}>
                <img
                  src={src}
                  alt={alt(i + 1)}
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className={PHOTO}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 hidden md:inline-flex" />
          <CarouselNext className="right-2 hidden md:inline-flex" />
          <span
            aria-live="polite"
            className="bg-scrim text-scrim-foreground absolute right-2 bottom-2 rounded-full px-2 py-0.5 text-xs tabular-nums"
          >
            {current + 1}/{photos.length}
          </span>
        </Carousel>
      )}
      {credit && <figcaption className="text-muted-foreground text-xs">{credit}</figcaption>}
    </figure>
  );
}
