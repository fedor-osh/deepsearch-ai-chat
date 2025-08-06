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

evalite("Dev Dataset - AI Technology", {
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

        return Math.min(technicalTermCount / 5, 1);
      },
    },
    {
      name: "Multi-hop Reasoning",
      description:
        "Checks if the response demonstrates multi-step reasoning and comparison.",
      scorer: ({ output, input }) => {
        const question =
          input.find((msg) => msg.role === "user")?.content || "";
        const isMultiHop =
          question.includes("compare") ||
          question.includes("difference") ||
          question.includes("how does");

        if (!isMultiHop) return 1; // Not applicable for single-hop questions

        const comparisonIndicators = [
          "while",
          "however",
          "on the other hand",
          "in contrast",
          "compared to",
          "difference",
          "similar",
          "both",
          "neither",
          "whereas",
        ];

        const hasComparison = comparisonIndicators.some((indicator) =>
          output.toLowerCase().includes(indicator.toLowerCase()),
        );

        return hasComparison ? 1 : 0;
      },
    },
    Factuality,
  ],
});
