import { createIcon } from "./icon";

export const ErrorIcon = createIcon(
  "ErrorIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6" />
    <path d="M15 9l-6 6" />
  </>,
);
