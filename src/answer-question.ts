import { generateText } from "ai";
import { model } from "~/models";
import type { SystemContext } from "./system-context";

export interface AnswerQuestionOptions {
  isFinal: boolean;
}

/**
 * Answer the user's question based on the current context
 */
export const answerQuestion = async (
  context: SystemContext,
  options: AnswerQuestionOptions,
): Promise<string> => {
  const { isFinal } = options;

  const systemPrompt = isFinal
    ? `You are a helpful AI assistant. You have been given some information to help answer the user's question, but you may not have all the information you need. Please provide your best attempt at answering the question based on the available information.

IMPORTANT: Since this is your final attempt, you should:
- Acknowledge any limitations in the information you have
- Provide the best answer possible with the available data
- Be clear about what you know and what you're uncertain about
- If you don't have enough information, suggest what additional information would be helpful

CURRENT DATE AND TIME: ${new Date().toISOString()}

The user's question is: "${context.getInitialQuestion()}"

Here is the information you have gathered:

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question.`
    : `You are a helpful AI assistant. You have gathered comprehensive information to answer the user's question. Please provide a detailed and accurate answer based on the information you have collected.

CURRENT DATE AND TIME: ${new Date().toISOString()}

The user's question is: "${context.getInitialQuestion()}"

Here is the information you have gathered:

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question, citing your sources appropriately.`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: `Based on the information gathered, please answer the user's question: "${context.getInitialQuestion()}"`,
  });

  return result.text;
};
