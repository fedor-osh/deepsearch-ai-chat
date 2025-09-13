import type { StreamTextResult } from "ai";
import { SystemContext } from "./system-context";
import { getNextAction } from "./get-next-action";
import { answerQuestion } from "./answer-question";
import { searchWeb } from "./search-web";
import { scrapeUrl } from "./scrape-url";

export interface RunAgentLoopOptions {
  userMessage: string;
}

/**
 * Runs the agent loop that continues until we have an answer or we've taken 10 actions
 */
export const runAgentLoop = async (
  options: RunAgentLoopOptions,
): Promise<StreamTextResult<Record<string, never>, string>> => {
  const { userMessage } = options;

  // Create a new context with the initial question
  const context = new SystemContext(userMessage);

  // A loop that continues until we have an answer or we've taken 10 actions
  while (!context.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(context);

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      const result = await searchWeb(nextAction.query ?? "");
      context.reportQueries([result]);
    } else if (nextAction.type === "scrape") {
      const result = await scrapeUrl(nextAction.urls ?? []);
      context.reportScrapes(result);
    } else if (nextAction.type === "answer") {
      return answerQuestion(context, {
        isFinal: false,
      });
    }

    // We increment the step counter
    context.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(context, { isFinal: true });
};
