import { streamText, type Message, type TelemetrySettings } from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";
import { env } from "~/env";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    experimental_telemetry: opts.telemetry,
    system: `You are a helpful AI assistant with access to web search and web scraping capabilities. 

CURRENT DATE AND TIME: ${new Date().toISOString()}

When users ask questions that require current information, facts, or recent events, you should use the searchWeb tool to find relevant information from the internet. The search results include publication dates for articles, which you should use to determine how recent the information is.

When users ask for "up to date" information, compare the publication dates in your search results with the current date above. Prioritize information from sources that are more recent, and clearly indicate when information might be outdated.

You have access to the scrapePages tool which can extract the full text content from web pages. You MUST ALWAYS use this tool after performing a web search to get the complete content of the most relevant web pages found in your search results.

After using searchWeb, ALWAYS use scrapePages to extract the full content from 4-6 of the most relevant and diverse URLs found in your search results. Choose URLs from different sources and perspectives to ensure comprehensive coverage of the topic. This ensures you have the most comprehensive and up-to-date information available from multiple viewpoints.

Always search the web when:
- Users ask about current events, news, or recent developments
- Users ask for factual information that might be outdated or need verification
- Users ask about specific products, services, or companies
- Users ask about weather, sports scores, or other real-time information
- Users ask about topics you're not completely confident about
- Always format URLs as markdown links.

After searching and scraping, ALWAYS cite your sources using proper markdown link formatting: [source title](url). Never just paste raw URLs - always format them as clickable markdown links.

For example, instead of writing "According to https://example.com/article", write "According to [Example Article](https://example.com/article)".

Be helpful, accurate, and always provide properly formatted source links when using web search results.`,
    onFinish: opts.onFinish,
    tools: {
      searchWeb: {
        parameters: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: env.SEARCH_RESULTS_COUNT },
            abortSignal,
          );

          return results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          }));
        },
      },
      scrapePages: {
        parameters: z.object({
          urls: z
            .array(z.string())
            .describe("Array of URLs to scrape for full content"),
        }),
        execute: async ({ urls }, { abortSignal }) => {
          const results = await bulkCrawlWebsites({
            urls,
            maxRetries: 3,
          });

          if (!results.success) {
            return {
              error: results.error,
              results: results.results.map((r) => ({
                url: r.url,
                success: r.result.success,
                data: r.result.success ? r.result.data : r.result.error,
              })),
            };
          }

          return {
            success: true,
            results: results.results.map((r) => ({
              url: r.url,
              data: r.result.data,
            })),
          };
        },
      },
    },
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
