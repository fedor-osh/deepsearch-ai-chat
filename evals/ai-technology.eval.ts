import { evalite } from "evalite";
import type { Message } from "ai";
import { askDeepSearch } from "../src/deep-search";
import { Factuality } from "../src/factuality-scorer";

evalite("AI Technology Deep Search Eval", {
  data: async (): Promise<{ input: Message[]; expected: string }[]> => {
    return [
      // Basic questions requiring recent knowledge
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
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "What are the latest developments in autonomous vehicle technology in 2024?",
          },
        ],
        expected:
          "Recent developments include expanded robotaxi services, improved safety systems, regulatory advancements, and new partnerships between automakers and tech companies.",
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "What is the current state of quantum computing and which companies are leading the field?",
          },
        ],
        expected:
          "Quantum computing is advancing with IBM, Google, Microsoft, and startups like PsiQuantum leading development of quantum processors and algorithms.",
      },

      // Multi-hop reasoning questions
      {
        input: [
          {
            id: "6",
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
            id: "7",
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
            id: "8",
            role: "user",
            content:
              "How does the performance of Claude 3.5 Sonnet on coding benchmarks compare to GPT-4o, and what specific coding tasks does each excel at?",
          },
        ],
        expected:
          "Both models excel at coding, with Claude 3.5 Sonnet showing strong performance on reasoning-heavy programming tasks and GPT-4o demonstrating speed and efficiency.",
      },
      {
        input: [
          {
            id: "9",
            role: "user",
            content:
              "What are the current limitations of large language models in terms of reasoning capabilities, and how are researchers addressing these limitations?",
          },
        ],
        expected:
          "Current limitations include reasoning errors, hallucination, and difficulty with complex multi-step problems. Researchers are addressing these through improved training methods, better prompting techniques, and architectural innovations.",
      },
      {
        input: [
          {
            id: "10",
            role: "user",
            content:
              "How do the pricing models of Claude 3.5 Sonnet, GPT-4o, and Gemini Advanced compare, and which offers the best value for different use cases?",
          },
        ],
        expected:
          "Pricing varies by model and usage, with each offering different value propositions for various applications like coding, analysis, or creative tasks.",
      },

      // Advanced multi-hop questions
      {
        input: [
          {
            id: "11",
            role: "user",
            content:
              "What are the environmental impacts of training large language models, and how do the carbon footprints of GPT-4, Claude 3.5, and Gemini Advanced compare?",
          },
        ],
        expected:
          "Training large language models has significant environmental impact due to energy consumption. Different models have varying carbon footprints based on training methods and infrastructure efficiency.",
      },
      {
        input: [
          {
            id: "12",
            role: "user",
            content:
              "How do the safety and alignment approaches of Anthropic, OpenAI, and Google differ, and what are the implications for AI development and deployment?",
          },
        ],
        expected:
          "Each company has different approaches to AI safety: Anthropic focuses on Constitutional AI, OpenAI uses RLHF, and Google emphasizes responsible AI development with various safety measures.",
      },
      {
        input: [
          {
            id: "13",
            role: "user",
            content:
              "What are the current regulatory frameworks for AI development in the US, EU, and China, and how do they affect the development of large language models?",
          },
        ],
        expected:
          "Regulatory frameworks vary significantly: EU has comprehensive AI Act, US has sector-specific regulations, and China has strict AI governance rules, all affecting model development and deployment.",
      },
      {
        input: [
          {
            id: "14",
            role: "user",
            content:
              "How do the multimodal capabilities of GPT-4o, Claude 3.5 Sonnet, and Gemini Advanced compare in terms of image understanding, video processing, and audio generation?",
          },
        ],
        expected:
          "Each model has different multimodal strengths: GPT-4o excels at real-time reasoning, Claude 3.5 Sonnet has strong image analysis, and Gemini Advanced offers comprehensive multimodal understanding.",
      },
      {
        input: [
          {
            id: "15",
            role: "user",
            content:
              "What are the current challenges in deploying large language models at scale, and how do companies like OpenAI, Anthropic, and Google address issues of latency, cost, and reliability?",
          },
        ],
        expected:
          "Scale deployment challenges include managing computational resources, reducing latency, controlling costs, and ensuring reliability. Companies address these through infrastructure optimization, model compression, and efficient serving strategies.",
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
