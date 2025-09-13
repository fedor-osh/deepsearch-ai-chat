import { evalite } from "evalite";
import type { Message } from "ai";
import { askDeepSearch } from "../src/deep-search";
import { Factuality } from "../src/factuality-scorer";
import { AnswerRelevancy } from "../src/answer-relevancy-scorer";
import { devData } from "./dev";
import { ciData } from "./ci";
import { regressionData } from "./regression";
import { env } from "../src/env";

// Start with dev data
let data = [...devData];

// If CI, add the CI data
if (env.EVAL_DATASET === "ci") {
  data.push(...ciData);
  // If Regression, add the regression data AND the CI data
} else if (env.EVAL_DATASET === "regression") {
  data.push(...ciData, ...regressionData);
}

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[]; expected: string }[]> => {
    return data;
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Regex to match markdown links: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
    AnswerRelevancy,
  ],
});
