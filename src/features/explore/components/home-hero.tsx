// S01 첫 화면 — 전남 명소 사진을 화면 가득 깔고 가운데에 브랜드 제목·부제와 큰 "계획짜기" 버튼을 올린다 (섬 반값여행 첫 화면 참고).
// 사진은 6초마다 넘어가고, 점 버튼으로 고르거나 멈춤 버튼으로 세울 수 있다. 움직임 줄이기 설정이면 자동으로 넘기지 않는다.
// 사진은 public/hero/의 정적 파일이다. 불러오는 중이거나 못 불러온 사진 자리는 브랜드색 바탕이 그대로 보인다 — 제목·버튼은 사진과 상관없이 바로 쓸 수 있다.
// 홈 맨 위에서는 투명해진 헤더(AppLayout)가 이 구역 위에 겹친다 — 막(scrim)을 늘 깔아 헤더의 흰 글자도 읽히게 한다.
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
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
import { cn } from "@/lib/utils";
import { HERO_SLIDES, type HeroPlaceKey } from "../lib/hero-slides";

const AUTOPLAY_MS = 1500;

interface HomeHeroProps {
  /** 제목(h1)의 id — 구역 이름으로 쓴다 */
  labelledBy: string;
}

export function HomeHero({ labelledBy }: HomeHeroProps) {
  const { t } = useTranslation("explore");

  return (
    <section
      aria-labelledby={labelledBy}
      className="h-hero bg-primary text-primary-foreground relative flex flex-col overflow-hidden"
    >
      <HeroPhotos />
      <div
        aria-hidden
        className="bg-scrim text-scrim-foreground pointer-events-none absolute inset-0"
      />
      {/* 버튼 밖에서는 사진을 밀어 넘길 수 있게 글 틀은 포인터를 통과시킨다. 위 여백 pt-20 = 겹친 헤더(h-14) + 6 */}
      <div className="text-scrim-foreground pointer-events-none relative mx-auto flex w-full max-w-screen-lg flex-1 flex-col items-center justify-center gap-3 px-4 pt-20 pb-8 text-center md:gap-5">
        <h1 id={labelledBy}>
          <img src="/brand/wordmark-white.svg" alt={t("brand")} className="h-14 w-auto md:h-24" />
        </h1>
        <p className="text-xl font-bold text-balance md:text-4xl">{t("hero.subtitle")}</p>
        <p className="text-base text-balance md:text-xl">{t("hero.tagline")}</p>
        <Button
          asChild
          size="xl"
          className="pointer-events-auto mt-4 h-14 rounded-full px-10 text-lg md:mt-6 md:h-16 md:px-14 md:text-xl"
        >
          <Link to={paths.tripNew}>{t("hero.cta")}</Link>
        </Button>
      </div>
    </section>
  );
}

function HeroPhotos() {
  const { t } = useTranslation("explore");
  const slides = HERO_SLIDES;
  const reduceMotion = useReducedMotion() ?? false;
  const captionId = useId();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  // 기본은 자동 넘김 — 멈춤 버튼으로 세울 수 있다. 움직임 줄이기 설정이면 미끄러지지 않고 바로 바뀐다
  const [autoplayChoice, setAutoplayChoice] = useState(true);
  const autoplay = autoplayChoice && slides.length > 1;

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
      api.scrollNext(reduceMotion);
    }, AUTOPLAY_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [api, autoplay, current, reduceMotion]);

  // 못 불러온 사진은 숨겨 브랜드색 바탕이 보이게 한다 (깨진 그림 표시 대신)
  const [failed, setFailed] = useState<ReadonlySet<HeroPlaceKey>>(new Set());
  const slide = slides[current] ?? slides[0];
  const nameOf = (key: HeroPlaceKey) => t(`hero.places.${key}`);

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
            <CarouselItem key={s.key} className="pl-0" aria-hidden={i !== current}>
              <img
                src={s.src}
                alt={t("hero.photoAlt", { name: nameOf(s.key) })}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                draggable={false}
                onError={() => {
                  setFailed((prev) => new Set(prev).add(s.key));
                }}
                className={cn("h-hero w-full object-cover", failed.has(s.key) && "invisible")}
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
            {slide.placeId ? (
              <Link
                to={paths.placeDetail(slide.placeId)}
                className="focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-md font-semibold text-pretty underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {nameOf(slide.key)} · {t(`sigun.${slide.sigun}`, { ns: "common" })}
                <ChevronRightIcon size="sm" />
              </Link>
            ) : (
              <p className="font-semibold text-pretty">
                {nameOf(slide.key)} · {t(`sigun.${slide.sigun}`, { ns: "common" })}
              </p>
            )}
            <p className="text-xs">
              {t("hero.credit", { credit: slide.credit })}
              {slide.license && (
                <>
                  {", "}
                  <a
                    href={slide.license.url}
                    target="_blank"
                    rel="noopener noreferrer license"
                    className="focus-visible:ring-ring rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {slide.license.label}
                  </a>
                </>
              )}
            </p>
          </div>
        )}
        {slides.length > 1 && (
          <div className="-ml-2 flex shrink-0 items-center sm:ml-0">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={t("hero.goTo", { n: i + 1, name: nameOf(s.key) })}
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
