import { Option, Schema } from "effect"

type NormalizedSuggestion = {
  id: string
  label: string
  prompt: string
  confidence?: number
}

const GeneratedSuggestion = Schema.Struct({
  label: Schema.String,
  prompt: Schema.String,
  confidence: Schema.optional(Schema.Number),
})
type GeneratedSuggestion = typeof GeneratedSuggestion.Type

const GeneratedPayload = Schema.Union([
  Schema.Struct({
    suggestions: Schema.Array(GeneratedSuggestion),
  }),
  Schema.Array(GeneratedSuggestion),
])
type GeneratedPayload = typeof GeneratedPayload.Type

const decodeGeneratedJson = Schema.decodeUnknownOption(Schema.fromJsonString(GeneratedPayload))

const MAX_PROMPT_CHARS = 220

export function normalizeSuggestions(text: string): NormalizedSuggestion[] {
  const parsed = parseGenerated(text)
  if (!parsed) return []
  const raw = rawSuggestions(parsed)
  return raw
    .flatMap((item): NormalizedSuggestion[] => {
      const label = compact(item.label)
      const prompt = compact(item.prompt)
      if (!label || !prompt || prompt.length > MAX_PROMPT_CHARS) return []
      if (unsafeSuggestion(`${label}\n${prompt}`)) return []
      return [
        {
          id: stableID(prompt),
          label: trim(label, 64),
          prompt,
          ...(typeof item.confidence === "number" ? { confidence: Math.max(0, Math.min(1, item.confidence)) } : {}),
        },
      ]
    })
    .filter(
      (item: NormalizedSuggestion, index: number, all: NormalizedSuggestion[]) =>
        all.findIndex((other) => other.prompt === item.prompt) === index,
    )
    .slice(0, 4)
}

function rawSuggestions(parsed: GeneratedPayload): readonly GeneratedSuggestion[] {
  if (!Array.isArray(parsed) && "suggestions" in parsed) return parsed.suggestions
  return parsed as readonly GeneratedSuggestion[]
}

function parseGenerated(text: string): GeneratedPayload | undefined {
  return [text, stripFence(text), extractObject(text)]
    .filter((candidate): candidate is string => candidate !== undefined && candidate.trim().length > 0)
    .map((candidate) => decodeGeneratedJson(candidate.trim()))
    .find(Option.isSome)?.value
}

function stripFence(text: string) {
  const trimmed = text.trim()
  if (!trimmed.startsWith("```")) return undefined
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
}

function extractObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return undefined
  return text.slice(start, end + 1)
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function trim(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`
}

export function unsafeSuggestion(text: string) {
  return (
    /\[(PRIVATE_PATH|EMAIL|TOKEN|SECRET|API_KEY)\]/i.test(text) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ||
    /(?:\b(?:sk|pk|ghp|github_pat|xox[baprs]|hf)[_-][A-Za-z0-9_-]{12,}\b|\bBearer\s+[A-Za-z0-9._~+/=-]{16,})/i.test(
      text,
    ) ||
    /(?:[A-Za-z]:[\\/]|\\\\|~[\\/]|\/(?:Users|home|root|tmp|opt|var|etc|mnt|Volumes|private|workspace)\/)/.test(text)
  )
}

function stableID(prompt: string) {
  return `sugg_${Bun.hash(prompt).toString(36)}`
}
