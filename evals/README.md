# Evaluating Kavosh

This framework measures how Kavosh changes research behavior and output quality under controlled, reviewable conditions.

## Evaluation question

Compare the same model and tool environment under at least two conditions:

1. **Baseline:** the same task prompt without the Kavosh skill;
2. **Kavosh:** the same task with the Kavosh skill active.

Keep the model, tool access, date window, source availability, and task wording as consistent as possible.

## Recommended test set

Use a balanced set that includes:

- current product specifications;
- a high-value product comparison;
- a scientific or health claim;
- a primary-source tracing task;
- contradictory credible sources;
- a quantitative calculation;
- a causal claim;
- real-world user evidence;
- and at least one negative-control question that does not require Kavosh.

Do not design the entire set around examples already encoded in the skill.

## Scoring dimensions

Score each dimension separately before calculating any aggregate:

- directness in answering the actual question;
- factual correctness against a documented answer key;
- primary-source coverage;
- independent verification where relevant;
- claim-to-citation support;
- freshness and version alignment;
- contradiction detection and handling;
- separation of fact, calculation, inference, and assumption;
- quantitative correctness;
- uncertainty calibration;
- absence of fabricated facts, sources, numbers, or probabilities;
- and efficiency, including unnecessary search or output.

## Required reporting

Every published benchmark should disclose:

- model and exact version;
- date of execution;
- tools and browsing access;
- task set and sampling method;
- baseline prompt;
- Kavosh version or commit;
- scoring rubric and judge method;
- number of runs;
- raw or reviewable outputs where permitted;
- aggregate method;
- uncertainty or variability;
- failures and exclusions;
- and known limitations.

## Comparative performance statements

Any published comparison should name the measured outcome, define the metric, identify the baseline, disclose the task sample and scoring method, report the number of runs, and provide enough evidence for another reviewer to reproduce or audit the result.

## Minimum acceptance checks for v1

- the skill activates on explicit invocation;
- it does not activate for a simple stable question when not requested;
- it selects research depth and evidence rigor;
- it preserves conflicting evidence when unresolved;
- it does not invent a probability when no valid basis exists;
- it distinguishes user-provided information from independently documented facts;
- it produces a compact execution trace without exposing private chain-of-thought;
- and it answers in the user's requested language without forcing a fixed output language.

---

**Kavosh was created by [@omerae7](https://github.com/omerae7).**
