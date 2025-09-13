import { bulkCrawlWebsites } from "~/scraper";

export interface ScrapeResult {
  url: string;
  result: string;
}

/**
 * Scrape multiple URLs and return the results
 */
export const scrapeUrl = async (urls: string[]): Promise<ScrapeResult[]> => {
  const results = await bulkCrawlWebsites({
    urls,
    maxRetries: 3,
  });

  if (!results.success) {
    // Return error results for failed scrapes
    return results.results.map((r) => ({
      url: r.url,
      result: r.result.success ? r.result.data : `Error: ${r.result.error}`,
    }));
  }

  return results.results.map((r) => ({
    url: r.url,
    result: r.result.data,
  }));
};
