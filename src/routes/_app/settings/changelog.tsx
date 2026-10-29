import { createFileRoute, notFound } from "@tanstack/react-router";
import { AjpDeploymentChangelog } from "@/client/features/settings/AjpDeploymentChangelog";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

export const Route = createFileRoute("/_app/settings/changelog")({
  beforeLoad: () => {
    // Deployment log is for our self-hosted fork, not OpenSEO Cloud.
    if (isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  component: AjpDeploymentChangelog,
});
