# Kavosh

### Search finds pages. Kavosh builds evidence.

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
![Agent Skills](https://img.shields.io/badge/standard-Agent%20Skills-2563eb)
![Platforms](https://img.shields.io/badge/platforms-ChatGPT%20%7C%20Codex%20%7C%20Claude-7c3aed)
![Status](https://img.shields.io/badge/status-v1%20community-f59e0b)

**Five research layers. Twenty functional roles. Two independent control axes. Zero tolerance for fabricated evidence.**

Kavosh is an evidence-first, modular deep-research skill for AI assistants. It turns web-enabled AI from a result summarizer into a structured research system that defines the question, finds the right evidence, audits sources and claims, resolves contradictions, performs the necessary analysis, and produces a traceable answer with calibrated confidence.

> **Deep research should be deep in method—not merely long in output.**

Kavosh is built for ChatGPT, Codex, and Claude using the open Agent Skills format. The same core skill works across supported environments; only installation and invocation differ. See the official [OpenAI Skills documentation](https://developers.openai.com/codex/build-skills) and [Claude Skills documentation](https://code.claude.com/docs/en/skills).

## Not another “research prompt”

Many AI research outputs look convincing while remaining fragile. Common failures include:

- repeating secondary summaries without reaching the original source;
- treating official or commercial claims as independently verified facts;
- hiding material disagreement between credible sources;
- mixing documented facts, calculations, inferences, and assumptions;
- using outdated information for fast-changing topics;
- inventing percentages, probabilities, scores, or ranges without a valid method;
- turning a handful of user reports into an alleged population-wide pattern;
- confusing correlation with causation;
- and writing conclusions with more certainty than the evidence supports.

Kavosh adds a repeatable research operating system around the model to reduce these failure modes.

## What makes Kavosh different?

| Typical AI search | Kavosh |
| --- | --- |
| Collects more search results | Selects the right source type for each claim |
| Uses one generic workflow | Activates only the modules the question needs |
| Relies heavily on summaries | Traces important claims to primary sources |
| Blends official claims and user experience | Separates official, independent, scientific, and real-world evidence |
| Smooths over conflicting sources | Investigates the cause and preserves unresolved conflict |
| Mixes facts and interpretation | Tracks explicit evidence states |
| Produces unsupported scores or odds | Refuses estimates without valid data or method |
| Treats “deep” as “more links” | Separates research depth from evidence rigor |
| Gives a polished answer with no audit trail | Adds a compact Kavosh Execution Trace |
| Sounds equally confident in every case | Calibrates conclusion strength to evidence strength |

## Adaptive research, not maximum research

Kavosh configures every investigation on two independent axes.

### Research depth

- **Quick** — a focused question with a small number of decisive sources;
- **Standard** — a multi-part question, comparison, or claim requiring more than one evidence type;
- **Deep** — a complex, disputed, high-impact, or multi-stage investigation requiring iterative search and challenge.

### Evidence rigor

- **Normal** — low-risk, straightforward, readily verifiable claims;
- **Enhanced** — important purchases, business decisions, consequential comparisons, or interested-party claims;
- **Sensitive** — medical, legal, financial, safety-critical, or otherwise high-consequence questions.

The axes are independent. A narrow question can require **Quick + Sensitive** research, while a broad but low-risk question can require **Deep + Normal** research.

## Five-layer architecture

Kavosh contains **20 functional roles** organized into five groups. These are responsibilities inside one research process—not a claim that 20 humans or autonomous agents participated. Only the roles required by the current question should activate.

### Group 1 — Research Direction

- **Research Lead**
- **User Context Advocate**

### Group 2 — Search and Investigation

- **Web Researcher**
- **Authoritative Source Researcher**
- **Scientific Researcher**
- **Primary Source Hunter**
- **Independent Evidence Researcher**
- **Real-World Evidence Researcher**
- **Evidence Extractor**

### Group 3 — Analysis

- **General Analyst**
- **Statistics and Uncertainty Analyst**
- **Causal Analyst**
- **Scenario and Sensitivity Analyst**
- **Comparative Analyst**

### Group 4 — Validation and Critique

- **Source and Claim Auditor**
- **Contradiction Reviewer**
- **Red Team**

### Group 5 — Final Answer

- **Research Synthesizer**
- **Research Editor**
- **Final Quality Controller**

## The Kavosh workflow

1. **Define the problem** — establish the real objective, scope, time horizon, user context, and evidence needs.
2. **Configure the research** — select depth, rigor, modules, controls, and stopping criteria.
3. **Design the search** — turn the main question into prioritized subquestions and target the right source types.
4. **Collect and register evidence** — preserve provenance, dates, scope, conditions, and limitations while researching.
5. **Analyze** — activate only the quantitative, causal, comparative, scenario, or general analysis that is required.
6. **Validate and challenge** — audit decisive claims, numbers, contradictions, hidden assumptions, and the provisional conclusion.
7. **Synthesize and write** — build a direct, coherent, evidence-weighted answer.
8. **Run final quality control** — recheck dates, units, calculations, citations, uncertainty, conflicts, and conclusion strength.

Research stops when the decisive questions are covered and additional sources are unlikely to change the answer materially—not when an arbitrary link count is reached.

## Evidence states

Kavosh keeps important findings in one of seven explicit states:

- **Documented**
- **User-Provided**
- **Calculated**
- **Inference**
- **Scenario Assumption**
- **Unknown**
- **Conflicting**

This prevents a model inference, a user statement, or a scenario assumption from silently becoming a “confirmed fact.”

## Core capabilities

- quick, standard, and deep research modes;
- normal, enhanced, and sensitive evidence rigor;
- adaptive module selection;
- primary-source tracing;
- independent verification of official and commercial claims;
- scientific literature assessment;
- real-world evidence analysis without false prevalence claims;
- freshness, version, market, and jurisdiction checks;
- conflict-of-interest and source-quality assessment;
- contradiction analysis and preservation;
- quantitative analysis with auditable inputs and formulas;
- explicit treatment of uncertainty;
- separation of correlation and causation;
- aligned multi-option comparison;
- scenario and sensitivity analysis without invented inputs;
- red-team review of provisional conclusions;
- claim-level citation discipline;
- and a compact execution trace showing what was actually checked.

## Default answer structure

Kavosh adapts the report to the question instead of generating empty sections. Its default structure is:

1. **Main Conclusion**
2. **Decisive Findings**
3. **Detailed Analysis**
4. **Disagreements and Limitations**
5. **Practical Takeaway** — only when the question is decision-oriented or actionable
6. **Kavosh Execution Trace**

The execution trace records the research depth, evidence rigor, active groups and modules, completed checks, source types, and any execution limitation that materially affected the result. It is an audit summary—not private chain-of-thought.

## When to use Kavosh

- high-value product or service comparisons;
- validation of commercial, organizational, or advertising claims;
- scientific, medical, and health evidence reviews;
- tracing the origin of a statistic, quote, claim, law, or specification;
- current regulations, standards, and official information;
- technology, company, and solution comparisons;
- manufacturer claims versus independent testing and user experience;
- conflicting-source investigations;
- market and competitor research;
- quantitative, causal, or scenario analysis;
- and evidence preparation for an important decision.

Kavosh supports decision-making with stronger evidence. It is not a boardroom simulation and does not replace the decision-maker.

## When not to use it

Kavosh is intentionally unnecessary for simple, stable questions that can be answered accurately without research—unless the user explicitly asks for it.

It also does not:

- equate more sources with better research;
- invent facts, sources, figures, probabilities, or outcomes;
- turn anecdotal reports into population rates;
- hide source conflicts to make an answer look cleaner;
- claim causation without an appropriate design and evidence base;
- pretend its functional roles are independent human researchers;
- or conceal missing tools, inaccessible sources, or incomplete coverage.

## Installation

Clone the repository:

```bash
git clone https://github.com/omerae7/kavosh.git
```

### Codex — personal skill

```bash
mkdir -p "$HOME/.agents/skills"
cp -R kavosh/skill "$HOME/.agents/skills/kavosh"
```

### Codex — repository skill

From the target repository root:

```bash
mkdir -p .agents/skills
cp -R /path/to/kavosh/skill .agents/skills/kavosh
```

Invoke it explicitly with `$kavosh`, or let Codex activate it when the task matches its description.

### Claude Code — personal skill

```bash
mkdir -p "$HOME/.claude/skills"
cp -R kavosh/skill "$HOME/.claude/skills/kavosh"
```

### Claude Code — project skill

From the target repository root:

```bash
mkdir -p .claude/skills
cp -R /path/to/kavosh/skill .claude/skills/kavosh
```

Invoke it with `/kavosh`, or let Claude activate it when relevant.

### ChatGPT

Standalone skills are supported in the ChatGPT desktop experience. Download the `skill/` directory, package it as a folder or ZIP, and use `@skill-creator` to install the uploaded Kavosh skill. In ChatGPT, invoke it explicitly with `@kavosh` or allow implicit activation when the request matches the skill description.

Broader one-click distribution in ChatGPT web and mobile requires plugin packaging and is not part of this v1 repository.

## Example prompts

### Product comparison

```text
Use Kavosh to compare DJI Osmo Pocket 3 with current flagship phones for filming architectural projects.

Research depth: Deep
Evidence rigor: Enhanced

Separate manufacturer claims, independent testing, and real-world user experience. Align model, market, test conditions, and total cost before comparing.
```

### Claim verification

```text
Use Kavosh to trace this statistic to its original source and determine whether independent sources support it. If credible sources disagree, explain why and preserve unresolved uncertainty.
```

### Scientific evidence

```text
Use Kavosh to assess whether this health claim is supported by current scientific evidence. Review suitable primary studies, systematic reviews, guidelines, limitations, conflicts of interest, and causal strength.
```

More examples are available in [`examples/PROMPTS.md`](examples/PROMPTS.md).

## Accuracy claims and benchmarks

Kavosh does **not** claim “75% higher accuracy,” “twice the quality,” or any other performance uplift without a defined benchmark, baseline, sample, scoring rubric, and reproducible results.

The project includes an evaluation framework in [`evals/README.md`](evals/README.md) so future claims can be measured instead of invented. Until comparative evaluations are published, the defensible claim is architectural: Kavosh adds explicit source selection, evidence-state tracking, contradiction handling, uncertainty controls, and final quality checks that ordinary ad-hoc prompting may omit.

## Cross-platform status

- **ChatGPT/Codex:** built on the OpenAI-supported Agent Skills structure.
- **Claude Code:** compatible with Claude's Agent Skills implementation and manually tested by the project creator.
- **Automated cross-platform benchmarks:** not yet published.

Research quality still depends on the host model, web and citation tools, accessible sources, and the quality of the available evidence.

## Repository structure

```text
kavosh/
├── README.md
├── LICENSE
├── NOTICE
├── CONTRIBUTING.md
├── skill/
│   ├── SKILL.md
│   ├── LICENSE
│   ├── NOTICE
│   ├── agents/
│   ├── assets/
│   └── references/
├── examples/
└── evals/
```

The installable skill stays clean and self-contained; project documentation and evaluation material remain outside the skill package.

## Roadmap

- publish representative research examples;
- run comparative evaluations against ordinary search and generic deep-research prompting;
- test explicit and implicit activation across supported platforms;
- expand contradiction, freshness, and uncertainty test cases;
- package Kavosh for broader plugin-based distribution;
- and iterate from documented community feedback.

## Contributing

Issues, research test cases, source-audit improvements, documentation fixes, and platform compatibility reports are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before submitting a change.

Every contribution should improve accuracy, transparency, traceability, or research efficiency—not merely make the output longer or more theatrical.

## Version and future editions

Kavosh v1 is a free, community-focused release under the MIT License. A separate advanced edition may be developed in the future. Any future edition will be clearly distinguished from this repository and will not retroactively change the license already granted for published v1 code and content.

## License

Kavosh v1 is released under the [MIT License](LICENSE). Attribution to the original creator must remain with redistributed copies as required by the license.

---

**Created and maintained by [@omerae7](https://github.com/omerae7).**

If Kavosh helps you produce better research, star the repository, test it on a difficult real question, and share the result or failure case. Evidence—not hype—is how this project improves.
