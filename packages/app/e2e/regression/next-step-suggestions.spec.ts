import { base64Encode } from "@opencode-ai/core/util/encode"
import { expect, test } from "@playwright/test"
import { mockOpenCodeServer } from "../utils/mock-server"
import { expectSessionTitle } from "../utils/waits"

const directory = "C:/OpenScience/NextStepSuggestions"
const projectID = "proj_next_step_suggestions"
const sessionID = "ses_next_step_suggestions"
const title = "Simulation setup continuation"
const suggestionPrompt = "Read the latest solver log and summarize the failure before changing the model."

test("next-step suggestion chips draft prompts but do not submit until send", async ({ page }) => {
  const promptRequests: unknown[] = []
  await mockOpenCodeServer(page, {
    directory,
    project: {
      id: projectID,
      worktree: directory,
      vcs: "git",
      name: "next-step-suggestions",
      time: { created: 1700000000000, updated: 1700000000000 },
      sandboxes: [],
    },
    provider: {
      all: [
        {
          id: "opencode",
          name: "OpenCode",
          models: {
            "gpt-4.1": {
              id: "gpt-4.1",
              name: "GPT 4.1",
              limit: { context: 200_000 },
            },
          },
        },
      ],
      connected: ["opencode"],
      default: { providerID: "opencode", modelID: "gpt-4.1" },
    },
    sessions: [
      {
        id: sessionID,
        slug: "next-step-suggestions",
        projectID,
        directory,
        title,
        version: "dev",
        time: { created: 1700000000000, updated: 1700000000000 },
      },
    ],
    pageMessages: () => ({ items: [] }),
    nextStepSuggestions: [
      {
        id: "read-log",
        label: "Read latest log",
        prompt: suggestionPrompt,
        confidence: 0.84,
      },
    ],
    onPromptAsync: (input) => promptRequests.push(input),
  })
  await page.addInitScript(() => {
    localStorage.setItem("settings.v3", JSON.stringify({ general: { newLayoutDesigns: true } }))
  })

  await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
  await expectSessionTitle(page, title)

  const suggestions = page.locator('[data-component="next-step-suggestions"]')
  const chip = suggestions.getByRole("button", { name: "Read latest log" })
  await expect(chip).toBeVisible()
  expect(promptRequests).toEqual([])

  await chip.click()
  expect(promptRequests).toEqual([])

  const composer = page.locator('[data-component="session-composer"]')
  await expect(composer.locator('[data-component="prompt-input"]')).toContainText(suggestionPrompt)

  const submitted = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === `/session/${sessionID}/prompt_async`,
  )
  await composer.locator('[data-action="prompt-submit"]').click()
  await submitted

  expect(promptRequests).toHaveLength(1)
  expect(promptRequests[0]).toMatchObject({
    sessionID,
    body: {
      parts: [expect.objectContaining({ type: "text", text: suggestionPrompt })],
    },
  })
})
