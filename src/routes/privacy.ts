import { createFileRoute } from "@tanstack/react-router";
import { publicInfoPageResponse } from "@/server/features/public-info/publicInfoPages";

export const Route = createFileRoute("/privacy")({
  server: {
    handlers: {
      GET: () => publicInfoPageResponse("privacy"),
    },
  },
});
