import { cn } from "cn"
import { LoadingIcon } from "@/components/icons"

function Spinner({ className, ...props }: Omit<React.ComponentProps<"svg">, "children">) {
  return (
    <LoadingIcon data-slot="spinner" role="status" aria-label="불러오는 중" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
