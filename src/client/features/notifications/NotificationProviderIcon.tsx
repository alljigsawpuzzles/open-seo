import { cn } from "cn";
import type { NotificationProvider } from "@/types/schemas/notifications";

const LABELS: Record<NotificationProvider, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
};

/** Brand-adjacent list icons (not official logos). */
export function NotificationProviderIcon({
  provider,
  className,
  size = "md",
}: {
  provider: NotificationProvider;
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-8 rounded-md" : "size-10 rounded-lg";
  const label = LABELS[provider];

  if (provider === "slack") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-[#4A154B] text-white",
          box,
          className,
        )}
        role="img"
        aria-label={label}
      >
        <svg
          viewBox="0 0 24 24"
          className={size === "sm" ? "size-4" : "size-5"}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M6.5 14.5a2 2 0 0 1-2-2v-2.5H2a2 2 0 0 1 0-4h2.5V4a2 2 0 0 1 4 0v2.5H11v2a2 2 0 0 1-2 2H6.5Zm11 0H14a2 2 0 0 1-2-2v-2.5H9.5a2 2 0 0 1 0-4H11V4a2 2 0 0 1 4 0v2.5H17.5a2 2 0 0 1 0 4H15v2a2 2 0 0 1-2 2h4.5Z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-[#5059C9] text-white",
        box,
        className,
      )}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "sm" ? "size-4" : "size-5"}
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M9.5 6.5h5v3h-5v-3Zm-5 5h5v3h-5v-3Zm10 0h5v3h-5v-3Zm-5 5h5v3h-5v-3Z"
        />
      </svg>
    </span>
  );
}
