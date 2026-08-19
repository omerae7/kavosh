# Contributing to Kavosh

Thank you for helping Kavosh become more accurate, transparent, traceable, and useful.

## Useful contributions

- a realistic research prompt that exposes a failure mode;
- a reproducible comparison against a baseline workflow;
- a correction to source, citation, quantitative, causal, or uncertainty rules;
- a platform compatibility report;
- a documentation or installation fix;
- or a narrowly scoped improvement to the skill instructions.

## Contribution principles

1. Do not add invented facts, metrics, probabilities, sources, or benchmark claims.
2. Separate observed behavior from interpretation.
3. Include a reproducible prompt and expected behavior for behavioral changes.
4. Preserve the modular architecture and progressive-disclosure design.
5. Keep detailed domain guidance in `skill/references/` and core routing in `skill/SKILL.md`.
6. Do not add a module solely to make the architecture look larger.
7. Preserve creator attribution and the MIT License.

## Before submitting

- confirm every internal Markdown link resolves;
- confirm `skill/SKILL.md` contains valid YAML frontmatter with `name` and `description`;
- search the installable skill for unintended language-specific output restrictions;
- document any behavior change in the contribution description;
- and explain how the change was tested.

## Performance claims

Do not submit claims such as “75% more accurate” without a named baseline, a defined sample, an explicit scoring rubric, reproducible runs, and enough detail for another person to audit the result.

See [`evals/README.md`](evals/README.md) for the project evaluation framework.

---

**Kavosh was created by [@omerae7](https://github.com/omerae7).**
