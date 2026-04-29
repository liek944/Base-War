---
trigger: model_decision
description: When user makes a bad prompt use these guidelines to improve said prompt
---

# CLAUDE.md — Prompting Best Practices for Claude

This file configures Claude's behavior. When present in your project, Claude reads and follows these guidelines automatically.

---

## Core Principles

### Be Clear and Direct

- Be specific about desired output format and constraints
- Provide instructions as numbered steps when order matters
- Treat Claude as a brilliant new employee who lacks your context — the more precisely you explain, the better the result
- If you want "above and beyond" behavior, explicitly request it

### Add Context

- Explain _why_ behind instructions, not just _what_
- Claude generalizes well from explanations, e.g. "never use ellipses — this will be read by a TTS engine"

### Use Examples

- Wrap examples in `<example>` tags (multiple in `<examples>` tags)
- Make examples relevant, diverse, and covering edge cases
- Aim for 3–5 examples for best results

### Structure with XML Tags

- Use `<instructions>`, `<context>`, `<input>` to separate content types
- Nest tags for hierarchical content (e.g., `<documents>` containing `<document index="n">`)

---

## Response Length & Verbosity

Claude calibrates response length to task complexity. To control this:

**For concise responses:**

```
Provide concise, focused responses. Skip non-essential context and keep examples minimal.
```

**For more detailed responses:**

```
Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation.
```

---

## Output Formatting

- Tell Claude what to do instead of what not to do
  - ❌ "Do not use markdown"
  - ✅ "Write in smoothly flowing prose paragraphs"
- Match your prompt style to your desired output style
- Use XML format indicators: "Write prose in `<smoothly_flowing_prose_paragraphs>` tags"

**To minimize markdown and bullet points:**

```
When writing reports, documents, or long-form content, write in clear flowing prose using complete paragraphs. Reserve markdown for inline code, code blocks, and simple headings. DO NOT use ordered or unordered lists unless presenting truly discrete items or the user explicitly requests a list.
```

**To avoid preambles:**

```
Respond directly without preamble. Do not start with phrases like "Here is...", "Based on...", "Certainly!", etc.
```

---

## Thinking & Reasoning

**To encourage step-by-step reasoning:**

```
Think carefully through this problem before responding. Use <thinking> tags for your reasoning and <answer> tags for your final response.
```

**To prevent overthinking on simple tasks:**

```
Extended thinking adds latency and should only be used when it will meaningfully improve answer quality — typically for problems that require multi-step reasoning. When in doubt, respond directly.
```

**To encourage commitment over endless deliberation:**

```
When deciding how to approach a problem, choose an approach and commit to it. Avoid revisiting decisions unless you encounter new information that directly contradicts your reasoning.
```

**To prompt self-checking:**

```
Before you finish, verify your answer against [your criteria here].
```

---

## Tool Use

**To make Claude take action (not just suggest):**

```
Implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed.
```

**To make Claude more conservative:**

```
Do not jump into implementation or change files unless clearly instructed. Default to providing information and recommendations rather than taking action.
```

**To maximize parallel tool calls:**

```
If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel. Never use placeholders or guess missing parameters.
```

---

## Agentic / Long-Horizon Tasks

**For tasks spanning long sessions:**

```
Your context window will be automatically compacted as it approaches its limit. Do not stop tasks early due to token budget concerns. Save your current progress and state before the context window refreshes. Always be as persistent and autonomous as possible and complete tasks fully.
```

**For safety on risky actions:**

```
Consider the reversibility and potential impact of your actions. Take local, reversible actions freely. For actions that are hard to reverse, affect shared systems, or could be destructive (deleting files, force-pushing, posting to external services), ask the user before proceeding.
```

**To prevent overengineering:**

```
Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused. Do not add features, abstractions, or documentation beyond what was asked.
```

**To prevent test-gaming or hard-coding:**

```
Write a high-quality, general-purpose solution. Do not hard-code values or create solutions that only work for specific test inputs. Implement the actual logic that solves the problem generally. If any tests are incorrect, inform me rather than working around them.
```

**To minimize hallucinations in code tasks:**

```
Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Give grounded, hallucination-free answers based only on what you have investigated.
```

---

## Frontend / Design Tasks

**To avoid generic "AI slop" aesthetics:**

```
NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), clichéd color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character. Use unique fonts, cohesive colors, and animations for effects and micro-interactions.
```

**To specify a concrete visual direction:**

- Provide explicit color hex codes, typeface names, corner radius, spacing values
- Describe the atmosphere: "cold monochrome", "warm editorial", "industrial/utilitarian", etc.

**To get design variety across generations:**

```
Before building, propose 4 distinct visual directions tailored to this brief (each as: bg hex / accent hex / typeface — one-line rationale). Ask the user to pick one, then implement only that direction.
```

---

## Long Context Tips

- Put longform documents **above** your query and instructions in the prompt
- Wrap documents in `<document index="n"><source>...</source><document_content>...</document_content></document>` tags
- Ask Claude to quote relevant sections before answering: "Find quotes relevant to [X], place in `<quotes>` tags, then answer"

---

## Roles

Set a role in the system prompt to focus Claude's behavior:

```
You are a senior DevOps engineer specializing in AWS, Docker, and CI/CD pipelines.
```

---

## Quick Reference Snippets

| Goal                     | Add to your prompt                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Concise output           | "Provide concise, focused responses. Skip non-essential context."                      |
| No preamble              | "Respond directly. Do not start with 'Here is...' or 'Certainly!'."                    |
| No bullet points         | "Write in flowing prose paragraphs. Do not use lists."                                 |
| Step-by-step reasoning   | "Think through this carefully using `<thinking>` tags before answering."               |
| Take action, not suggest | "Implement the changes, don't just suggest them."                                      |
| Avoid overengineering    | "Only make changes that are directly requested. Keep solutions minimal."               |
| Avoid hallucinations     | "Read all relevant files before answering. Never speculate."                           |
| Parallel tool calls      | "Make all independent tool calls in parallel."                                         |
| Creative frontend        | "Avoid generic AI aesthetics. Use distinctive fonts, cohesive colors, and animations." |
| Safe agentic behavior    | "Ask before any destructive or irreversible actions."                                  |
