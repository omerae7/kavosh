# Documented Example: One Skill Across Multiple AI Hosts

## Research question

Can one Agent Skill package use the same core instructions across ChatGPT, Codex, and Claude Code, and what must change between hosts?

**Verification date:** 2026-08-19  
**Evidence scope:** Current official OpenAI and Anthropic documentation.

## Main conclusion

Yes. A portable core can use the same `SKILL.md` instructions and supporting references across these hosts because OpenAI and Claude Code both implement the open Agent Skills format. Installation paths, explicit invocation syntax, product-specific metadata, and some host extensions remain different.

For Kavosh, the practical design is therefore:

- keep the research workflow and routing logic in `skill/SKILL.md`;
- keep detailed guidance in portable `skill/references/` files;
- use only the common `name` and `description` frontmatter required by the shared format;
- isolate OpenAI-specific interface metadata in `skill/agents/openai.yaml`;
- document host-specific installation and invocation separately.

## Decisive findings

| Finding | Evidence state | Source |
| --- | --- | --- |
| OpenAI defines a skill as a directory containing a required `SKILL.md` and optional scripts, references, assets, and OpenAI metadata. | Documented | [OpenAI — Build skills](https://developers.openai.com/codex/build-skills) |
| ChatGPT selects skills with `@`; Codex can invoke a skill with `$` and can also activate it implicitly from its description. | Documented | [OpenAI — How ChatGPT and Codex use skills](https://developers.openai.com/codex/build-skills#how-chatgpt-and-codex-use-skills) |
| Codex discovers repository and personal skills from `.agents/skills` locations. | Documented | [OpenAI — Where Codex loads local skills](https://developers.openai.com/codex/build-skills#where-codex-loads-local-skills) |
| Claude Code uses `SKILL.md`, supports automatic activation, and invokes a skill directly with `/skill-name`. | Documented | [Anthropic — Extend Claude with skills](https://code.claude.com/docs/en/skills) |
| Claude Code follows the open Agent Skills standard but also supports host-specific extensions. | Documented | [Anthropic — Skills](https://code.claude.com/docs/en/skills) |
| A shared skill package is portable at the instruction level, but host-specific installation, invocation, and optional metadata should not be treated as universal. | Inference from documented platform behavior | Synthesis of the official sources above |

## What portability does not mean

Portable instructions do not guarantee identical output across hosts. Results may differ because models, browsing tools, citation systems, permissions, context limits, and source access differ. Host-specific features should remain optional so the core research workflow still degrades gracefully.

## Why Kavosh uses this repository structure

```text
skill/
├── SKILL.md                 # Portable core workflow
├── references/              # Portable detailed guidance
├── assets/                  # Skill assets
└── agents/openai.yaml       # Optional OpenAI-specific interface metadata
```

This layout keeps the research method independent from the host interface while allowing OpenAI products to display richer metadata.

## Practical takeaway

Install the same `skill/` directory in the location supported by the target host, then use that host's invocation syntax:

| Host | Explicit invocation | Typical skill location or installation route |
| --- | --- | --- |
| ChatGPT | `@kavosh` | Skills interface in an eligible ChatGPT experience |
| Codex | `$kavosh` | `.agents/skills/kavosh` or `~/.agents/skills/kavosh` |
| Claude Code | `/kavosh` | `.claude/skills/kavosh` or `~/.claude/skills/kavosh` |

## Disagreements and limitations

No material contradiction was found between the official sources about the shared format. The main limitation is product scope: each host evolves independently, so installation and feature details should be rechecked against current documentation.

## Kavosh Execution Trace

| Item | Completed work |
| --- | --- |
| Research depth | Standard |
| Evidence rigor | Normal |
| Active groups | Research Direction; Search and Investigation; Analysis; Validation and Critique; Final Answer |
| Active modules | Research Lead; Authoritative Source Researcher; Primary Source Hunter; Evidence Extractor; Comparative Analyst; Source and Claim Auditor; Research Synthesizer; Research Editor; Final Quality Controller |
| Completed checks | Primary documentation, freshness, platform alignment, claim-to-source support, contradiction review, final terminology check |
| Source types | Official primary platform documentation |
| Execution limitation | No controlled cross-model output benchmark was part of this example |

---

**Kavosh was created by [@omerae7](https://github.com/omerae7).**
