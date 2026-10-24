// 상세 화면 공용 조각 — 사진 갤러리·정보 행·안내 상자.
// 값이 없는 정보 행은 그리지 않는다 ("--" 표기 금지, docs/DESIGN.md §4).
import type { ReactNode } from "react";
import { InfoIcon, WarningIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { PhotoAsset } from "@/shared/domain";

export function PhotoGallery({
  photos,
  alt,
  fallbackIcon,
}: {
  photos: PhotoAsset[];
  alt: string;
  fallbackIcon?: ReactNode;
}) {
  if (photos.length <= 1) {
    return (
      <Photo
        photo={photos[0]}
        alt={alt}
        credit="overlay"
        priority
        fallbackIcon={fallbackIcon}
        className="aspect-4/3 w-full md:aspect-video md:rounded-xl"
      />
    );
  }
  return (
    <Carousel opts={{ loop: false }} className="w-full" aria-label={`${alt} 사진`}>
      <CarouselContent className="ml-0">
        {photos.map((p, i) => (
          <CarouselItem key={p.url} className="pl-0">
            <Photo
              photo={p}
              alt={`${alt} 사진 ${String(i + 1)}`}
              credit="overlay"
              priority={i === 0}
              className="aspect-4/3 w-full md:aspect-video md:rounded-xl"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 hidden md:inline-flex" />
      <CarouselNext className="right-2 hidden md:inline-flex" />
    </Carousel>
  );
}

export function InfoRow({
  icon,
  label,
  children,
  aside,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: "warning" | "destructive" | "info";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "info" ? InfoIcon : WarningIcon;
  return (
    <div
      role={tone === "info" ? "note" : "alert"}
      className={cn(
        "flex gap-3 rounded-xl p-4 text-sm",
        tone === "warning" && "bg-warning-soft text-warning-soft-foreground",
        tone === "destructive" && "bg-destructive-soft text-destructive-soft-foreground",
        tone === "info" && "bg-background-subtle text-foreground",
        className,
      )}
    >
      <Icon size="sm" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function DetailSection({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
