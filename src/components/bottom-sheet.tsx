// 공용 바텀시트 — shadcn Drawer(vaul) 조합. 모바일은 아래에서 올라오는 시트, PC는 가운데 폭을 제한한 시트.
// 필터·일정에 담기·시간 수정처럼 사용자가 직접 연 작업에만 쓴다 (docs/DESIGN.md §2).
import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className={cn("mx-auto w-full md:max-w-lg md:rounded-t-xl", className)}>
        <DrawerHeader className="text-left md:text-left">
          <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>
        {footer ? (
          <DrawerFooter className="pb-safe border-border border-t">{footer}</DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
