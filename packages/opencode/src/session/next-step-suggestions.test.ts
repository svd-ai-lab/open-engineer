import { describe, expect, test } from "bun:test"
import { normalizeSuggestions, unsafeSuggestion } from "./next-step-suggestions-util"

describe("next step suggestion normalization", () => {
  test("keeps small safe suggestions and caps the response", () => {
    const suggestions = normalizeSuggestions(
      JSON.stringify({
        suggestions: [
          { label: "Read latest log", prompt: "Read the latest solver log and summarize the failure.", confidence: 2 },
          { label: "Validate result", prompt: "Validate the newest result against the acceptance criteria." },
          { label: "Continue setup", prompt: "Continue the setup checklist from the last failed step." },
          { label: "Summarize evidence", prompt: "Generate a short evidence summary for the current run." },
          { label: "Extra", prompt: "This fifth suggestion should be dropped." },
        ],
      }),
    )

    expect(suggestions).toHaveLength(4)
    expect(suggestions[0]).toMatchObject({
      label: "Read latest log",
      prompt: "Read the latest solver log and summarize the failure.",
      confidence: 1,
    })
  })

  test("drops placeholders, raw paths, emails, and token-like text", () => {
    const suggestions = normalizeSuggestions(
      JSON.stringify({
        suggestions: [
          { label: "Private path", prompt: "Open C:/Users/alice/project/run.log and inspect it." },
          { label: "Server path", prompt: "Read /opt/console/logs/gateway-contexts/gateway-contexts.sqlite." },
          { label: "Email", prompt: "Email alice@example.com with the result." },
          { label: "Token", prompt: "Use sk-1234567890abcdefghijklmn to retry the call." },
          { label: "Safe", prompt: "Read the latest visible log and summarize the failure stage." },
        ],
      }),
    )

    expect(suggestions.map((item) => item.label)).toEqual(["Safe"])
  })

  test("recognizes unsafe standalone strings", () => {
    expect(unsafeSuggestion("Use [TOKEN] to continue")).toBe(true)
    expect(unsafeSuggestion("Check ~/private/run.log")).toBe(true)
    expect(unsafeSuggestion("Retry with Bearer abcdefghijklmnopqrstuvwxyz")).toBe(true)
    expect(unsafeSuggestion("Validate the newest visible result")).toBe(false)
  })
})
