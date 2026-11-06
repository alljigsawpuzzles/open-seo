import { cn } from "cn";
import type { NotificationProvider } from "@/types/schemas/notifications";
import slackMarkSvg from "@/client/features/notifications/250px-slack-icon.svg";
import teamsMarkSvg from "@/client/features/notifications/250px-microsoft-teams.svg";

const LABELS: Record<NotificationProvider, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
};

const SRC: Record<NotificationProvider, string> = {
  slack: slackMarkSvg,
  teams: teamsMarkSvg,
};

/**
 * Official-looking marks bundled with the client (`250px-*.svg`). Replaces
 * static `/notifications/*.webp` so icons ship in the same deploy as the app.
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
  const px = size === "sm" ? 32 : 40;

  return (
    <img
      src={SRC[provider]}
      alt={LABELS[provider]}
      width={px}
      height={px}
      className={cn("shrink-0 object-contain", box, className)}
    />
  );
}
