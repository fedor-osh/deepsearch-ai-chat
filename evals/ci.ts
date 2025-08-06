import type { Message } from "ai";

export const ciData: { input: Message[]; expected: string }[] = [
  // Additional basic questions for CI testing
  {
    input: [
      {
        id: "7",
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
        id: "8",
        role: "user",
        content:
          "What is the current state of quantum computing and which companies are leading the field?",
      },
    ],
    expected:
      "Quantum computing is advancing with IBM, Google, Microsoft, and startups like PsiQuantum leading development of quantum processors and algorithms.",
  },
  {
    input: [
      {
        id: "9",
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
        id: "10",
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
        id: "11",
        role: "user",
        content: "What is the latest version of TypeScript?",
      },
    ],
    expected: "The current TypeScript version is 5.8",
  },
  {
    input: [
      {
        id: "12",
        role: "user",
        content: "What are the main features of Next.js 15?",
      },
    ],
    expected: `
@next/codemod CLI: Easily upgrade to the latest Next.js and React versions.
Async Request APIs (Breaking): Incremental step towards a simplified rendering and caching model.
Caching Semantics (Breaking): fetch requests, GET Route Handlers, and client navigations are no longer cached by default.
React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.
Turbopack Dev (Stable): Performance and stability improvements.
Static Indicator: New visual indicator shows static routes during development.
unstable_after API (Experimental): Execute code after a response finishes streaming.
instrumentation.js API (Stable): New API for server lifecycle observability.
Enhanced Forms (next/form): Enhance HTML forms with client-side navigation.
next.config: TypeScript support for next.config.ts.
Self-hosting Improvements: More control over Cache-Control headers.
Server Actions Security: Unguessable endpoints and removal of unused actions.
Bundling External Packages (Stable): New config options for App and Pages Router.
ESLint 9 Support: Added support for ESLint 9.
Development and Build Performance: Improved build times and Faster Fast Refresh.
`,
  },
];
