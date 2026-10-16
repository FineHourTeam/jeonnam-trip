import type { ReactNode, SVGProps } from "react";
import { ICON_STYLE } from "./icon-style";

export type IconSize = "sm" | "md" | "lg";
const PX: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: IconSize;
  /** 아이콘만으로 뜻을 전하면 필수 — 스크린리더가 읽는다. 옆에 글자가 있으면(장식) 생략 → aria-hidden */
  label?: string;
};

/** 프로젝트 아이콘 하나를 만든다. glyph에는 24×24 그리드 위의 path·circle 등만 넣는다 (색은 currentColor만). */
export function createIcon(displayName: string, glyph: ReactNode) {
  function Icon({ size = "md", label, ...rest }: IconProps) {
    const px = PX[size];
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={px}
        height={px}
        viewBox={ICON_STYLE.viewBox}
        fill={ICON_STYLE.fill}
        stroke="currentColor"
        strokeWidth={ICON_STYLE.strokeWidth}
        strokeLinecap={ICON_STYLE.linecap}
        strokeLinejoin={ICON_STYLE.linejoin}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        {...rest}
      >
        {glyph}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
