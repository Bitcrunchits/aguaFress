# Skill Registry — aguaFress

Last updated: 2026-07-05
Total skills: 28 (deduplicated, excluding `_shared`, `sdd-*`, and `skill-registry`)

## Registry Contract

- `sdd-*` skills, `_shared`, and `skill-registry` are excluded from this index.
- When a skill exists in both user-level and project-level directories, the project-level version wins.
- Delegators: match skills by file extension/path context AND task context, then pass the exact `path` to sub-agents.

## Skills

| Skill | Description | Scope | Path |
|-------|-------------|-------|------|
| branch-pr | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | user | `/home/adrian/.config/opencode/skills/branch-pr/SKILL.md` |
| chained-pr | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | user | `/home/adrian/.config/opencode/skills/chained-pr/SKILL.md` |
| cognitive-doc-design | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user | `/home/adrian/.config/opencode/skills/cognitive-doc-design/SKILL.md` |
| comment-writer | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | user | `/home/adrian/.config/opencode/skills/comment-writer/SKILL.md` |
| dont-be-stupid | Guard quality during implementation AND pre-test AND review — catches SOLID violations and STUPID anti-patterns before wasting time on tests against bad structure. Trigger: implement, check code, review code, test setup, pre-test, juzgar, dont be stupid. | user | `/home/adrian/.config/opencode/skills/dont-be-stupid/SKILL.md` |
| find-skills | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. | user | `/home/adrian/.claude/skills/find-skills/SKILL.md` |
| go-testing | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | user | `/home/adrian/.config/opencode/skills/go-testing/SKILL.md` |
| ia-integrations | Trigger: ia_integrations, proyecto ia, hybrid ai, entorno desarrollo. Stack: JS/TS, PNPM, VS Code, HTML/CSS. Workflow híbrido Ollama + Gemini. | user | `/home/adrian/.config/opencode/skills/ia-integrations/SKILL.md` |
| issue-creation | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | user | `/home/adrian/.config/opencode/skills/issue-creation/SKILL.md` |
| judgment-day | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | user | `/home/adrian/.config/opencode/skills/judgment-day/SKILL.md` |
| neon-landing | Generates neon-glass themed landing/reference pages in HTML with dark background, glassmorphism containers, and cyberpunk aesthetic. Trigger: When user wants to create a landing page, cheat sheet, or reference doc with neon/cyberpunk visual style. | user | `/home/adrian/.config/opencode/skills/neon-landing/SKILL.md` |
| react-19 | React 19 patterns with React Compiler. Trigger: When writing React components — no useMemo/useCallback needed. | user | `/home/adrian/.claude/skills/react-19/SKILL.md` |
| react-native-mobile | Trigger: React Native, Expo, app móvil, componente, pantalla. Patrones de arquitectura, componentes, servicios, navegación y estado para apps React Native + Expo. | user | `/home/adrian/.config/opencode/skills/react-native-mobile/SKILL.md` |
| skill-creator | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | user | `/home/adrian/.config/opencode/skills/skill-creator/SKILL.md` |
| skill-improver | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | user | `/home/adrian/.config/opencode/skills/skill-improver/SKILL.md` |
| typescript | TypeScript strict patterns and best practices. Trigger: When writing TypeScript code — types, interfaces, generics. 🔥 NEW: Prisma Nullability Match rule added. | user | `/home/adrian/.claude/skills/typescript/SKILL.md` |
| work-unit-commits | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | user | `/home/adrian/.config/opencode/skills/work-unit-commits/SKILL.md` |
