import { cn } from "cn";
import type { NotificationProvider } from "@/types/schemas/notifications";

const LABELS: Record<NotificationProvider, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
};

const SRC: Record<NotificationProvider, string> = {
  slack: "/notifications/slack-mark.webp",
  teams: "/notifications/teams-mark.webp",
};

/**
 * Official marks from `src/public/notifications/*.webp` (Vite `publicDir`; brand assets supplied by operator).
 */
export function NotificationProviderIcon({
  provider,
  className,
  size = "md",
}: {
  provider: NotificationProvider;
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-8" : "size-10";

  return (
    <img
      src={SRC[provider]}
      alt={LABELS[provider]}
      width={size === "sm" ? 32 : 40}
      height={size === "sm" ? 32 : 40}
      className={cn("shrink-0 object-contain", box, className)}
    />
  );
}
