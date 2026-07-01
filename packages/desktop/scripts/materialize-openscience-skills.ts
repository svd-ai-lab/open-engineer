#!/usr/bin/env bun
import path from "node:path"
import { mkdirSync, rmSync } from "node:fs"

import {
  copySkillDirectory,
  countFiles,
  findLockEntry,
  loadManifestAndLock,
  materializedSourceDir,
  skillsDir,
  validateSkillFile,
} from "./openscience-skills"

const offline = /^(1|true|yes)$/i.test(process.env.OPENSCIENCE_SKILLS_OFFLINE ?? "")
const { manifest, lock } = loadManifestAndLock()

rmSync(skillsDir, { recursive: true, force: true })
mkdirSync(skillsDir, { recursive: true })

const rows: Array<{ name: string; source: string; files: number }> = []
for (const entry of manifest.skills) {
  const lockEntry = findLockEntry(lock, entry)
  if (!lockEntry) throw new Error(`Missing skills.lock.json entry for ${entry.name}`)

  const excludes = [...(manifest.defaultExcludes ?? []), ...(entry.excludes ?? [])]
  const resolved = materializedSourceDir(entry, lockEntry, offline)
  validateSkillFile(resolved.sourceDir, entry.name, lockEntry.skillMdSha256)

  const destDir = path.join(skillsDir, entry.name)
  copySkillDirectory(resolved.sourceDir, destDir, excludes)
  validateSkillFile(destDir, entry.name, lockEntry.skillMdSha256)
  rows.push({ name: entry.name, source: resolved.source, files: countFiles(destDir) })
}

console.table(rows)
