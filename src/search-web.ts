import { searchSerper } from "~/serper";
import { env } from "~/env";

export interface SearchResult {
  query: string;
  results: {
    date: string;
    title: string;
    url: string;
    snippet: string;
  }[];
}

/**
 * Search the web using Serper API
 */
export const searchWeb = async (query: string): Promise<SearchResult> => {
  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    undefined, // no abort signal for now
  );

  return {
    query,
    results: results.organic.map((result) => ({
      url: result.link,
      title: result.title,
      snippet: result.snippet,
      date: result.date ?? new Date().toISOString().split("T")[0] ?? "", // fallback to current date
    })),
  };
};
