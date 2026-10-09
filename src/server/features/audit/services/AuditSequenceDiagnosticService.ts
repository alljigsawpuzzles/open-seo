import { env } from "cloudflare:workers";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { CrawlerCredentialService } from "@/server/features/audit/services/CrawlerCredentialService";
import { runDirectCrawlDiagnostic } from "@/server/lib/audit/direct-crawl-diagnostic";
import { AppError } from "@/server/lib/errors";
import { parseAuditConfig } from "@/server/lib/audit/types";

async function diagnoseAuditSequence(input: {
  auditId: string;
  projectId: string;
  organizationId: string;
}) {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");
  const config = parseAuditConfig(audit.config);
  if (!config?.crawlerCredentialId)
    throw new AppError(
      "NOT_FOUND",
      "Audit has no selected crawler credential.",
    );
  const credential =
    await CrawlerCredentialService.getCrawlerAccessForCredential(
      input.organizationId,
      config.crawlerCredentialId,
    );
  if (!credential)
    throw new AppError(
      "NOT_FOUND",
      "Selected crawler credential is unavailable.",
    );
  const url = new URL(audit.startUrl);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  const appAccess = await CrawlerCredentialService.openCrawlerAccess(
    credential.sealed,
  );
  if (!appAccess) {
    return {
      auditId: audit.id,
      credentialId: credential.id,
      url: url.toString(),
      result: { access: "decryption_failed" as const },
    };
  }
  const appProbe = await runDirectCrawlDiagnostic(url.toString(), appAccess, {
    method: "HEAD",
    includeAccept: false,
  });
  const workerResult = await env.AUDIT_ENGINE.diagnoseAuditSequence({
    url: url.toString(),
    access: credential.sealed,
  });
  const result =
    workerResult.access === "decryption_failed"
      ? { access: "decryption_failed" as const }
      : {
          access: "opened" as const,
          validation:
            workerResult.validation.outcome === "invalid"
              ? {
                  outcome: "invalid" as const,
                  problem: { ...workerResult.validation.problem },
                }
              : { outcome: workerResult.validation.outcome },
          appProbe: {
            ...appProbe,
            headerPresence: { ...appProbe.headerPresence },
          },
          requests: {
            robots: {
              ...workerResult.requests.robots,
              headerPresence: {
                ...workerResult.requests.robots.headerPresence,
              },
            },
            sitemap: {
              ...workerResult.requests.sitemap,
              headerPresence: {
                ...workerResult.requests.sitemap.headerPresence,
              },
            },
            homepage: {
              ...workerResult.requests.homepage,
              headerPresence: {
                ...workerResult.requests.homepage.headerPresence,
              },
            },
          },
        };
  return {
    auditId: audit.id,
    credentialId: credential.id,
    url: url.toString(),
    result,
  };
}

export const AuditSequenceDiagnosticService = {
  diagnoseAuditSequence,
} as const;
