import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/google701c28ee5f38fa90.html")({
  server: {
    handlers: {
      GET: () =>
        new Response("google-site-verification: google701c28ee5f38fa90.html", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }),
    },
  },
});
