import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { Provider } from "@/provider/provider"
import { MessageV2 } from "./message-v2"
import { normalizeSuggestions } from "./next-step-suggestions-util"
import type { Info as SessionInfo } from "./session"
import { generateText, type ModelMessage } from "ai"
import { Context, Effect, Layer, Schema } from "effect"

export const Suggestion = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  prompt: Schema.String,
  confidence: Schema.optional(Schema.Number),
})
export type Suggestion = typeof Suggestion.Type

export const Response = Schema.Struct({
  suggestions: Schema.Array(Suggestion),
})
export type Response = typeof Response.Type

const MAX_TURNS = 8
const MAX_TURN_CHARS = 900
const MAX_CONTEXT_CHARS = 6_000
const SUGGESTION_TIMEOUT_MS = 15_000

const SYSTEM_PROMPT = [
  "You generate OpenScience next-step autocomplete chips.",
  "Return only JSON: {\"suggestions\":[{\"label\":\"...\",\"prompt\":\"...\",\"confidence\":0.7}]}",
  "Suggest tiny, reviewable next prompts the user may send; do not execute anything.",
  "Use only the transcript context. If the next step is unclear or there is no useful tiny step, return {\"suggestions\":[]}.",
  "Keep labels under 36 characters and prompts under 180 characters.",
  "Preserve the user's language when it is clear.",
  "Do not include emails, tokens, placeholders, or absolute local/server paths.",
].join("\n")

export interface Interface {
  readonly suggest: (input: { session: SessionInfo; messages: SessionV1.WithParts[] }) => Effect.Effect<Response>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/NextStepSuggestions") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const provider = yield* Provider.Service

    const suggest = Effect.fn("NextStepSuggestions.suggest")(function* (input: {
      session: SessionInfo
      messages: SessionV1.WithParts[]
    }) {
      const context = transcript(input.messages)
      if (!context) return { suggestions: [] }

      const selected = yield* selectModel(provider, input).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("next step suggestions model unavailable", {
            sessionID: input.session.id,
            cause,
          }).pipe(Effect.as(undefined)),
        ),
      )
      if (!selected) return { suggestions: [] }

      const language = yield* provider.getLanguage(selected).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("next step suggestions language unavailable", {
            sessionID: input.session.id,
            providerID: selected.providerID,
            modelID: selected.id,
            cause,
          }).pipe(Effect.as(undefined)),
        ),
      )
      if (!language) return { suggestions: [] }

      const started = Date.now()
      const generated = yield* Effect.tryPromise({
        try: () =>
          generateText({
            model: language,
            temperature: selected.capabilities.temperature ? 0.2 : undefined,
            maxOutputTokens: 512,
            abortSignal: AbortSignal.timeout(SUGGESTION_TIMEOUT_MS),
            messages: modelMessages(context),
          }),
        catch: (error) => error,
      }).pipe(
        Effect.timeoutOrElse({
          duration: `${SUGGESTION_TIMEOUT_MS} millis`,
          orElse: () =>
            Effect.logWarning("next step suggestions generation timed out", {
              sessionID: input.session.id,
              providerID: selected.providerID,
              modelID: selected.id,
              latencyMs: Date.now() - started,
            }).pipe(Effect.as(undefined)),
        }),
        Effect.catchCause((cause) =>
          Effect.logWarning("next step suggestions generation failed", {
            sessionID: input.session.id,
            providerID: selected.providerID,
            modelID: selected.id,
            latencyMs: Date.now() - started,
            cause,
          }).pipe(Effect.as(undefined)),
        ),
      )
      const suggestions = normalizeSuggestions(generated?.text ?? "")
      yield* Effect.logInfo("next step suggestions generated", {
        sessionID: input.session.id,
        providerID: selected.providerID,
        modelID: selected.id,
        latencyMs: Date.now() - started,
        count: suggestions.length,
      })
      return { suggestions }
    })

    return Service.of({ suggest })
  }),
)

const selectModel = Effect.fn("NextStepSuggestions.selectModel")(function* (
  provider: Provider.Interface,
  input: { session: SessionInfo; messages: SessionV1.WithParts[] },
) {
  for (const candidate of modelCandidates(input)) {
    const model = yield* provider
      .getModel(candidate.providerID, candidate.modelID)
      .pipe(Effect.catch(() => Effect.succeed(undefined)))
    if (model) return model
  }

  const fallback = yield* provider.defaultModel()
  return yield* provider.getModel(fallback.providerID, fallback.modelID)
})

export function modelCandidates(input: { session: SessionInfo; messages: SessionV1.WithParts[] }) {
  const latest = MessageV2.latest(input.messages)
  const candidates = [
    input.session.model ? { providerID: input.session.model.providerID, modelID: input.session.model.id } : undefined,
    latest.assistant ? { providerID: latest.assistant.providerID, modelID: latest.assistant.modelID } : undefined,
    latest.user ? { providerID: latest.user.model.providerID, modelID: latest.user.model.modelID } : undefined,
  ]
  return candidates
    .filter((candidate): candidate is NonNullable<(typeof candidates)[number]> => candidate !== undefined)
    .filter(
      (candidate, index, all) =>
        all.findIndex((other) => other.providerID === candidate.providerID && other.modelID === candidate.modelID) ===
        index,
    )
}

function modelMessages(context: string): ModelMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: ["Recent session transcript:", context, "Return JSON now."].join("\n\n"),
    },
  ]
}

function transcript(messages: SessionV1.WithParts[]) {
  const turns = messages
    .slice(-MAX_TURNS)
    .flatMap((message) => {
      const text = message.parts.flatMap(partText).join("\n").trim()
      if (!text) return []
      return [`${message.info.role}: ${trim(text, MAX_TURN_CHARS)}`]
    })
    .join("\n\n")
  return trim(turns, MAX_CONTEXT_CHARS).trim()
}

function partText(part: SessionV1.Part): string[] {
  if (part.type === "text" && !part.ignored && part.text.trim()) return [part.text]
  if (part.type === "file" && part.filename) return [`[Attached file: ${part.filename}]`]
  return []
}

function trim(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`
}

export const node = LayerNode.make(layer, [Provider.node])

export * as NextStepSuggestions from "./next-step-suggestions"
