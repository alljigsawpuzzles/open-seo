import { getDomain } from "tldts";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  createDataforseoClient,
  CHATGPT_LOCATION_CODE,
  CHATGPT_LANGUAGE_CODE,
} from "@/server/lib/dataforseo";
import { AppError } from "@/server/lib/errors";

// Preserve the pre-v0.1.14 DataForSEO-only relevance path for self-hosts.
// It cannot disambiguate meanings as precisely as the optional model filter.
const GENERIC_DOMAINS = new Set([
  "amazon.com",
  "dev.to",
  "facebook.com",
  "github.com",
  "google.com",
  "instagram.com",
  "linkedin.com",
  "medium.com",
  "pinterest.com",
  "producthunt.com",
  "quora.com",
  "reddit.com",
  "tiktok.com",
  "twitter.com",
  "wikipedia.org",
  "x.com",
  "ycombinator.com",
  "youtube.com",
]);
const domain = (value: string | null | undefined) =>
  value ? getDomain(value) : null;
const words = (value: string) =>
  value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export async function relevantQuestionsWithoutModel(
  prompts: Array<{ question: string; sources: Array<{ domain: string }> }>,
  keyword: string,
  brands: Array<{ domain: string }>,
  customer: BillingCustomerContext,
) {
  const client = createDataforseoClient(customer);
  const serp = await client.serp
    .live({
      keyword,
      locationCode: CHATGPT_LOCATION_CODE,
      languageCode: CHATGPT_LANGUAGE_CODE,
      depth: 50,
    })
    .catch((error: unknown) => {
      if (error instanceof AppError && error.code === "UPSTREAM_UNAVAILABLE")
        return [];
      throw error;
    });
  const relevantDomains = new Set([
    ...brands.flatMap((brand) => domain(brand.domain) ?? []),
    ...serp
      .flatMap((item) =>
        item.type === "organic" ? (domain(item.domain) ?? []) : [],
      )
      .filter((value) => !GENERIC_DOMAINS.has(value)),
  ]);
  const phrase = words(keyword).join(" ");
  return new Set(
    prompts
      .filter(
        (prompt) =>
          (phrase.length > 0 &&
            (" " + words(prompt.question).join(" ") + " ").includes(
              " " + phrase + " ",
            )) ||
          prompt.sources.some((source) => {
            const host = domain(source.domain);
            return host !== null && relevantDomains.has(host);
          }),
      )
      .map((prompt) => prompt.question),
  );
}
