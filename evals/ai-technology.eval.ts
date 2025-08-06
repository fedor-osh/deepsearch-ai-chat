import { evalite } from "evalite";
import type { Message } from "ai";
import { askDeepSearch } from "../src/deep-search";
import { Factuality } from "../src/factuality-scorer";
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

evalite("AI Technology Deep Search Eval", {
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
    {
      name: "Recent Information",
      description:
        "Checks if the response contains information from 2024 or later.",
      scorer: ({ output }) => {
        const recentInfoRegex =
          /(2024|2025|recent|latest|current|new|updated)/i;
        const containsRecentInfo = recentInfoRegex.test(output);

        return containsRecentInfo ? 1 : 0;
      },
    },
    {
      name: "Technical Depth",
      description:
        "Checks if the response contains technical terminology and detailed explanations.",
      scorer: ({ output }) => {
        const technicalTerms = [
          "context window",
          "multimodal",
          "reasoning",
          "benchmarks",
          "training",
          "inference",
          "latency",
          "throughput",
          "parameters",
          "architecture",
          "alignment",
          "safety",
          "regulatory",
          "deployment",
        ];

        const technicalTermCount = technicalTerms.filter((term) =>
          output.toLowerCase().includes(term.toLowerCase()),
        ).length;

        // Score based on number of technical terms found (0-1 scale)
        return Math.min(technicalTermCount / 5, 1);
      },
    },
    Factuality,
  ],
});
