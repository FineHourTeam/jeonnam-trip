// S01 첫 화면 — 전남 명소 사진을 화면 가득 깔고 그 위에 제목·조건 카드를 올린다 (남도여행길잡이 첫 화면 참고).
// 사진은 6초마다 넘어가고, 점 버튼으로 고르거나 멈춤 버튼으로 세울 수 있다. 움직임 줄이기 설정이면 자동으로 넘기지 않는다.
// 사진을 불러오는 중이거나 못 불러오면 브랜드색 바탕에 같은 내용을 보여 준다 — 제목·조건은 사진과 상관없이 바로 쓸 수 있다.
// 홈 맨 위에서는 투명해진 헤더(AppLayout)가 이 구역 위에 겹친다 — 막(scrim)을 늘 깔아 헤더의 흰 글자도 읽히게 한다.
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePlacesByIds } from "@/features/places";
import { cn } from "@/lib/utils";
import { placeText } from "@/shared/lib/content-text";
import { HERO_SLIDES, buildHeroSlides, type HeroSlide } from "../lib/hero-slides";

const AUTOPLAY_MS = 6000;
const HERO_PLACE_IDS = HERO_SLIDES.map((s) => s.placeId);

interface HomeHeroProps {
  /** 제목(h1)의 id — 구역 이름으로 쓴다 */
  labelledBy: string;
  /** 사진 위에 올릴 제목·조건 카드 */
  children: ReactNode;
}

export function HomeHero({ labelledBy, children }: HomeHeroProps) {
  const { i18n } = useTranslation("explore");
  const places = usePlacesByIds(HERO_PLACE_IDS);
  const slides = buildHeroSlides(
    (places.data ?? []).map((p) => ({ ...p, name: placeText(p, i18n.language).name })),
  );
  const hasPhotos = slides.length > 0;

  return (
    <section
      aria-labelledby={labelledBy}
      className="h-hero bg-primary text-primary-foreground relative flex flex-col overflow-hidden"
    >
      {hasPhotos && <HeroPhotos slides={slides} />}
      <div
        aria-hidden
        className="bg-scrim text-scrim-foreground pointer-events-none absolute inset-0"
      />
      {/* 가운데 글·카드 밖에서는 사진을 밀어 넘길 수 있게 바깥 틀은 포인터를 통과시킨다. 위 여백 pt-20 = 겹친 헤더(h-14) + 6 */}
      <div className="text-scrim-foreground pointer-events-none relative mx-auto flex w-full max-w-screen-md flex-1 flex-col justify-center px-4 pt-20 pb-8">
        <div className="pointer-events-auto flex flex-col gap-6">{children}</div>
      </div>
    </section>
  );
}

function HeroPhotos({ slides }: { slides: HeroSlide[] }) {
  const { t } = useTranslation("explore");
  const reduceMotion = useReducedMotion() ?? false;
  const captionId = useId();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  // null = 사용자가 아직 고르지 않음 → 움직임 줄이기 설정을 따른다
  const [autoplayChoice, setAutoplayChoice] = useState<boolean | null>(null);
  const autoplay = (autoplayChoice ?? !reduceMotion) && slides.length > 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // current가 바뀔 때마다 타이머를 새로 건다 — 점 버튼·밀어 넘기기 직후 바로 다음 사진으로 넘어가지 않게
  useEffect(() => {
    if (!api || !autoplay) return;
    const timer = window.setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [api, autoplay, current]);

  const slide = slides[current] ?? slides[0];

  return (
    <>
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        aria-label={t("hero.carousel")}
        aria-describedby={captionId}
        className="absolute inset-0"
      >
        <CarouselContent className="ml-0">
          {slides.map((s, i) => (
            <CarouselItem key={s.id} className="pl-0" aria-hidden={i !== current}>
              <img
                src={s.src}
                alt={t("hero.photoAlt", { name: s.name })}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                draggable={false}
                className="h-hero w-full object-cover"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="text-scrim-foreground relative order-last mx-auto flex w-full max-w-screen-md flex-col items-start gap-2 px-4 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        {slide && (
          <div
            id={captionId}
            aria-live={autoplay ? "off" : "polite"}
            className="flex min-w-0 flex-col gap-1"
          >
            <Link
              to={paths.placeDetail(slide.id)}
              className="focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-md font-semibold text-pretty underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {slide.name} · {t(`sigun.${slide.sigun}`, { ns: "common" })}
              <ChevronRightIcon size="sm" />
            </Link>
            <p className="text-xs">{t("hero.credit")}</p>
          </div>
        )}
        {slides.length > 1 && (
          <div className="-ml-2 flex shrink-0 items-center sm:ml-0">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={t("hero.goTo", { n: i + 1, name: s.name })}
                aria-current={i === current}
                onClick={() => {
                  api?.scrollTo(i, reduceMotion);
                }}
                className="focus-visible:ring-ring flex size-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "bg-scrim-foreground h-1.5 rounded-full transition-all",
                    i === current ? "w-4" : "w-1.5 opacity-50",
                  )}
                />
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={autoplay ? t("hero.pause") : t("hero.play")}
              onClick={() => {
                setAutoplayChoice(!autoplay);
              }}
              className="text-scrim-foreground hover:bg-scrim hover:text-scrim-foreground ml-1"
            >
              {autoplay ? <PauseIcon size="sm" /> : <PlayIcon size="sm" />}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
