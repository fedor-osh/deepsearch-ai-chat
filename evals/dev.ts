import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
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
