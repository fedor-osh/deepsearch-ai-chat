import { z } from "zod";
import type { SystemContext } from "./system-context";
import { generateObject } from "ai";
import { model } from "~/models";

export const actionSchema = z.object({
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export const getNextAction = async (context: SystemContext) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant with access to web search and web scraping capabilities.`,
    prompt: `
You need to choose the next action to take based on the user's question and the current context.

Based on this context, choose the most appropriate next action:

- If you need more information to answer the user's question, choose "search" with a relevant query
- If you have search results but need to scrape specific URLs for more detailed information, choose "scrape" with the URLs to scrape
- If you have enough information to provide a comprehensive answer, choose "answer"

Remember to always search the web when:
- Users ask about current events, news, or recent developments
- Users ask for factual information that might be outdated or need verification
- Users ask about specific products, services, or companies
- Users ask about weather, sports scores, or other real-time information
- Users ask about topics you're not completely confident about

After searching, always scrape the most relevant URLs to get comprehensive information from multiple sources.

CURRENT DATE AND TIME: ${new Date().toISOString()}

The user's question is: "${context.getInitialQuestion()}"

Here is the current context:

${context.getQueryHistory()}

${context.getScrapeHistory()}
`,
  });

  return result.object;
};
