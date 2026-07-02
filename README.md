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

<img width="2560" height="1504" alt="skill_list_02" src="https://github.com/user-attachments/assets/99f12927-437d-4888-a3a3-bc66ee4902c1" />
<img width="2560" height="1504" alt="demo_paper_search" src="https://github.com/user-attachments/assets/9ca99160-dd4d-4638-a4df-2978387716aa" />

v0 skills:

- `research-paper-data`: public scholarly metadata search, identifier
  resolution, and legal open-access full-text discovery.
- `pdf`, `docx`, `xlsx`: scientific document and table workflows.
- `sim-paper-reproduction`: evidence-first simulation paper reproduction.
- `simulation-need-discovery`: simulation requirement scoping.
- `geometry-preview`: lightweight geometry generation and QA before CAD or
  solver work.

Solver skills, one per supported CAE/CAD tool, each routing agent workflows
against the real solver (saved files, batch execution, or live sessions):

- `comsol-sim` (COMSOL Multiphysics)
- `abaqus-sim` (Abaqus)
- `fluent-sim` (Ansys Fluent)
- `workbench-sim` (Ansys Workbench)
- `mechanical-sim` (Ansys Mechanical)
- `flotherm-sim` (Siemens Simcenter Flotherm)
- `starccm-sim` (Simcenter STAR-CCM+)
- `hfss` (Ansys HFSS)
- `hypermesh-sim` (Altair HyperMesh)
- `matlab-sim` (MATLAB)
- `stata-sim` (Stata)
- `autodeskfusion` (Autodesk Fusion)
- `rhino` (Rhino)

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


<img width="2560" height="1504" alt="skill_list_01" src="https://github.com/user-attachments/assets/a97366f2-343b-4669-a78d-c9173e3f6112" />

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

## Versioning

OpenScience has its own desktop release version, independent of upstream
OpenCode. The product version lives in `packages/desktop/package.json` and is
the version used by Windows installers, update metadata, and GitHub release
tags.

The upstream OpenCode base and WSL OpenCode CLI target remain separate. They
come from the workspace OpenCode package version in
`packages/opencode/package.json`. Do not use the upstream OpenCode tag as the
OpenScience desktop package version unless the product release intentionally
chooses the same number.

The Windows release workflow verifies that the manual release input matches the
desktop package version before building.

## Attribution

OpenScience is based on upstream OpenCode v1.17.11 and keeps the upstream MIT
license. See [LICENSE](LICENSE).
