import { For, Show, createMemo, createResource } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { useServerSDK } from "@/context/server-sdk"

type NextStepSuggestion = {
  id: string
  label: string
  prompt: string
  confidence?: number
}

const blockedMarkers = ["[PRIVATE_PATH]", "[EMAIL]", "[TOKEN]"]

export function SessionNextStepSuggestions(props: {
  sessionID?: string
  refreshKey?: string
  onPick: (prompt: string) => void
}) {
  const serverSDK = useServerSDK()
  const source = createMemo(() => (props.sessionID ? `${props.sessionID}\n${props.refreshKey ?? ""}` : undefined))
  const [suggestions] = createResource(source, async (key) => {
    const sessionID = key.split("\n", 1)[0]!
    const response = await serverSDK().fetch(`/session/${encodeURIComponent(sessionID)}/next_step_suggestions`)
    if (response.status === 404) return []
    if (!response.ok) return []
    return normalizeSuggestions(await response.json())
  })
  const items = createMemo(() => suggestions.latest ?? suggestions() ?? [])

  return (
    <Show when={items().length > 0}>
      <div data-component="next-step-suggestions" class="flex min-w-0 items-center gap-1 overflow-hidden">
        <For each={items()}>
          {(item) => (
            <ButtonV2
              data-action="next-step-suggestion"
              type="button"
              variant="ghost-muted"
              size="small"
              title={item.prompt}
              class="max-w-[180px] justify-start truncate"
              onClick={() => props.onPick(item.prompt)}
            >
              <span class="truncate">{item.label}</span>
            </ButtonV2>
          )}
        </For>
      </div>
    </Show>
  )
}

function normalizeSuggestions(input: unknown): NextStepSuggestion[] {
  const record = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
  const raw = Array.isArray(input) ? input : Array.isArray(record.suggestions) ? record.suggestions : []
  return raw.map(normalizeSuggestion).filter((item): item is NextStepSuggestion => item !== undefined).slice(0, 4)
}

function normalizeSuggestion(input: unknown, index: number): NextStepSuggestion | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  const record = input as Record<string, unknown>
  const label = cleanString(record.label, 40)
  const prompt = cleanString(record.prompt, 600)
  if (!label || !prompt) return undefined
  if (containsBlockedMarker(label) || containsBlockedMarker(prompt)) return undefined
  const confidence = typeof record.confidence === "number" && Number.isFinite(record.confidence) ? record.confidence : undefined
  const suggestion = {
    id: typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 80) : `next-step-${index}`,
    label,
    prompt,
  }
  return confidence === undefined ? suggestion : { ...suggestion, confidence }
}

function cleanString(value: unknown, limit: number) {
  if (typeof value !== "string") return undefined
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return undefined
  return text.slice(0, limit)
}

function containsBlockedMarker(text: string) {
  return blockedMarkers.some((marker) => text.includes(marker))
}
