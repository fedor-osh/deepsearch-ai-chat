import { evalite } from "evalite";
import type { Message } from "ai";
import { askDeepSearch } from "../src/deep-search";
import { Factuality } from "../src/factuality-scorer";

evalite("Dev Dataset - AI Technology", {
  data: async (): Promise<{ input: Message[]; expected: string }[]> => {
    return [
      // Basic questions - testing fundamental capabilities
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of Claude and what are its key features?",
          },
        ],
        expected:
          "Claude 3.5 Sonnet is the latest version, featuring improved reasoning, coding, and multimodal capabilities with enhanced performance on complex tasks.",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of GPT-4o and how does it differ from GPT-4?",
          },
        ],
        expected:
          "GPT-4o features improved reasoning, faster response times, better multilingual capabilities, and enhanced multimodal understanding compared to GPT-4.",
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content:
              "What is the current status of Google's Gemini Advanced and what are its capabilities?",
          },
        ],
        expected:
          "Gemini Advanced is Google's most capable AI model, featuring advanced reasoning, coding, and creative capabilities with multimodal understanding.",
      },

      // Multi-hop questions - testing reasoning capabilities
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "Which AI model has the largest context window currently available, and how does this compare to the context window of GPT-4 Turbo?",
          },
        ],
        expected:
          "Claude 3.5 Sonnet has a 200K context window, while GPT-4 Turbo has a 128K context window, making Claude's significantly larger.",
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "What are the main differences between Anthropic's Constitutional AI approach and OpenAI's reinforcement learning from human feedback (RLHF) method?",
          },
        ],
        expected:
          "Constitutional AI uses explicit principles and self-critique, while RLHF relies on human feedback to train reward models for alignment.",
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content:
              "How do the pricing models of Claude 3.5 Sonnet, GPT-4o, and Gemini Advanced compare, and which offers the best value for different use cases?",
          },
        ],
        expected:
          "Pricing varies by model and usage, with each offering different value propositions for various applications like coding, analysis, or creative tasks.",
      },
    ];
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
