#!/usr/bin/env bun
import path from "node:path"
import { mkdirSync, rmSync } from "node:fs"

import {
  copySkillDirectory,
  countFiles,
  findLockEntry,
  findResourceLockEntry,
  loadManifestAndLock,
  materializedResourceDir,
  materializedSourceDir,
  normalizedDirectorySha256,
  skillsDir,
  validateSkillFile,
} from "./openscience-skills"

const offline = /^(1|true|yes)$/i.test(process.env.OPENSCIENCE_SKILLS_OFFLINE ?? "")
const { manifest, lock } = loadManifestAndLock()

rmSync(skillsDir, { recursive: true, force: true })
mkdirSync(skillsDir, { recursive: true })

const rows: Array<{ kind: string; name: string; source: string; files: number }> = []
for (const entry of manifest.resources ?? []) {
  const lockEntry = findResourceLockEntry(lock, entry)
  if (!lockEntry) throw new Error(`Missing skills.lock.json resource entry for ${entry.name}`)

  const excludes = [...(manifest.defaultExcludes ?? []), ...(entry.excludes ?? [])]
  const resolved = materializedResourceDir(entry, lockEntry, offline)
  const actualSourceSha = normalizedDirectorySha256(resolved.sourceDir, excludes)
  if (actualSourceSha !== lockEntry.directorySha256) {
    throw new Error(
      `Resource directory sha256 mismatch for ${entry.name}: expected ${lockEntry.directorySha256}, got ${actualSourceSha}`,
    )
  }

  const destDir = path.join(skillsDir, entry.name)
  copySkillDirectory(resolved.sourceDir, destDir, excludes)
  const actualDestSha = normalizedDirectorySha256(destDir)
  if (actualDestSha !== lockEntry.directorySha256) {
    throw new Error(
      `Materialized resource sha256 mismatch for ${entry.name}: expected ${lockEntry.directorySha256}, got ${actualDestSha}`,
    )
  }
  rows.push({ kind: "resource", name: entry.name, source: resolved.source, files: countFiles(destDir) })
}

for (const entry of manifest.skills) {
  const lockEntry = findLockEntry(lock, entry)
  if (!lockEntry) throw new Error(`Missing skills.lock.json entry for ${entry.name}`)

  const excludes = [...(manifest.defaultExcludes ?? []), ...(entry.excludes ?? [])]
  const resolved = materializedSourceDir(entry, lockEntry, offline)
  validateSkillFile(resolved.sourceDir, entry.name, lockEntry.skillMdSha256)

  const destDir = path.join(skillsDir, entry.name)
  copySkillDirectory(resolved.sourceDir, destDir, excludes)
  validateSkillFile(destDir, entry.name, lockEntry.skillMdSha256)
  rows.push({ kind: "skill", name: entry.name, source: resolved.source, files: countFiles(destDir) })
}

console.table(rows)
