# OpenScience

OpenScience is an open source science workbench based on
[OpenCode](https://github.com/anomalyco/opencode).

The first release targets Windows x64 and bundles science-oriented skills and
workflows on top of upstream OpenCode. It does not include a private login
system, a model proxy, a shared API key, or a bundled default model. Models are
configured through OpenCode's native providers, including OpenCode Zen,
Anthropic, OpenAI, OpenRouter, Gemini, Ollama, and other upstream providers.

## Windows Preview

Download the latest Windows installer from
[GitHub Releases](https://github.com/svd-ai-lab/openscience/releases).

Initial artifacts:

- `OpenScience-win-x64.exe`
- `OpenScience-win-x64.exe.blockmap`
- `latest.yml`
- `OpenScience-win-x64.exe.sha256.txt`

The v0 Windows build is unsigned. Verify the SHA256 file before installing.

## Bundled Science Skills

OpenScience materializes the bundled skills at build time into
`packages/desktop/resources/openscience-config/skills`.

v0 skills:

- `research-paper-data`: public scholarly metadata search, identifier
  resolution, and legal open-access full-text discovery.
- `pdf`, `docx`, `xlsx`: scientific document and table workflows.
- `sim-paper-reproduction`: evidence-first simulation paper reproduction.
- `simulation-need-discovery`: simulation requirement scoping.
- `geometry-preview`: lightweight geometry generation and QA before CAD or
  solver work.

External skills are locked by source repository, commit, path, and `SKILL.md`
SHA256 in `skills.lock.json`. OpenScience-owned skills live under
`skills-src/` and are copied into the generated `skills/` directory.

## Paper Search

The OpenScience `research-paper-data` skill uses public or user-configured
sources only:

- Public defaults: Crossref, arXiv, Europe PMC, DataCite.
- Optional: `UNPAYWALL_EMAIL` for Unpaywall legal OA discovery.
- Optional: `OPENALEX_API_KEY` for broader OpenAlex coverage and citation graph
  checks.

It must not use Sci-Hub, paywall bypasses, private CORE keys, Huanjing/Sim
Studio research APIs, or any OpenScience backend proxy.

## Development

```bash
bun install --linker hoisted
bun run --cwd packages/desktop typecheck
bun run --cwd packages/desktop materialize:skills
$env:OPENCODE_CHANNEL="prod"; bun run --cwd packages/desktop build
$env:OPENCODE_CHANNEL="prod"; bun run --cwd packages/desktop package:win:x64
```

The desktop sidecar is started with only:

```text
OPENCODE_CONFIG_DIR=<bundled openscience-config>
```

OpenScience intentionally does not set `OPENCODE_CONFIG`, does not override the
default model/provider, and does not inject API keys.

## Attribution

OpenScience is based on upstream OpenCode v1.17.11 and keeps the upstream MIT
license. See [LICENSE](LICENSE).
