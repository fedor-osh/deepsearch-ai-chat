import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
  // Advanced multi-hop questions for regression testing
  {
    input: [
      {
        id: "13",
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
        id: "14",
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
        id: "15",
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
        id: "16",
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
        id: "17",
        role: "user",
        content:
          "What are the current challenges in deploying large language models at scale, and how do companies like OpenAI, Anthropic, and Google address issues of latency, cost, and reliability?",
      },
    ],
    expected:
      "Scale deployment challenges include managing computational resources, reducing latency, controlling costs, and ensuring reliability. Companies address these through infrastructure optimization, model compression, and efficient serving strategies.",
  },
  {
    input: [
      {
        id: "18",
        role: "user",
        content:
          "What are the latest developments in AI hardware acceleration, and how do specialized chips like TPUs, GPUs, and custom ASICs compare for large language model inference?",
      },
    ],
    expected:
      "AI hardware acceleration is advancing rapidly with specialized chips offering different trade-offs between performance, efficiency, and cost for large language model inference.",
  },
  {
    input: [
      {
        id: "19",
        role: "user",
        content:
          "How do the training data sources and preprocessing techniques differ between major AI models, and what impact does this have on their capabilities and biases?",
      },
    ],
    expected:
      "Training data sources and preprocessing techniques vary significantly between models, affecting their knowledge, capabilities, and potential biases in different domains.",
  },
  {
    input: [
      {
        id: "20",
        role: "user",
        content:
          "What are the current state-of-the-art techniques for reducing hallucination in large language models, and how effective are methods like retrieval-augmented generation and fact-checking?",
      },
    ],
    expected:
      "Current techniques for reducing hallucination include retrieval-augmented generation, fact-checking mechanisms, and improved training methods, with varying levels of effectiveness across different approaches.",
  },
];
