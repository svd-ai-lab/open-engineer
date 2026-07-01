#!/usr/bin/env bun
import path from "node:path"
import { existsSync } from "node:fs"

import {
  type ResourceLockEntry,
  type SkillLockEntry,
  type SkillsManifest,
  configDir,
  lockPath,
  manifestPath,
  normalizedDirectorySha256,
  normalizedSkillFileSha256,
  readJson,
  repoRootFor,
  runGit,
  validateSkillFile,
  writeJson,
} from "./openscience-skills"

const manifest = readJson<SkillsManifest>(manifestPath)
const resources: ResourceLockEntry[] = []
const skills: SkillLockEntry[] = []

for (const entry of manifest.resources ?? []) {
  const matchedRoot = (() => {
    for (const candidate of entry.localCandidates ?? []) {
      const root = repoRootFor(candidate)
      if (root && existsSync(path.join(root, entry.path))) return root
    }
    return undefined
  })()
  if (!matchedRoot) throw new Error(`No local checkout found for resource ${entry.name}; clone ${entry.repo}`)

  const status = runGit(matchedRoot, ["status", "--porcelain", "--", entry.path]).stdout
  if (status) throw new Error(`Refusing to lock dirty resource for ${entry.name}: ${matchedRoot}/${entry.path}`)

  const commit = runGit(matchedRoot, ["rev-parse", "HEAD"]).stdout
  const sourceDir = path.join(matchedRoot, entry.path)
  const excludes = [...(manifest.defaultExcludes ?? []), ...(entry.excludes ?? [])]
  resources.push({
    type: "external-resource",
    name: entry.name,
    repo: entry.repo,
    commit,
    path: entry.path,
    directorySha256: normalizedDirectorySha256(sourceDir, excludes),
  })
}

for (const entry of manifest.skills) {
  if (entry.type === "local") {
    const sourceDir = path.join(configDir, entry.path)
    validateSkillFile(sourceDir, entry.name)
    skills.push({
      type: "local",
      name: entry.name,
      path: entry.path,
      skillMdSha256: normalizedSkillFileSha256(path.join(sourceDir, "SKILL.md")),
    })
    continue
  }

  const matchedRoot = (() => {
    for (const candidate of entry.localCandidates ?? []) {
      const root = repoRootFor(candidate)
      if (root && existsSync(path.join(root, entry.path, "SKILL.md"))) return root
    }
    return undefined
  })()
  if (!matchedRoot) throw new Error(`No local checkout found for ${entry.name}; add localCandidates or clone ${entry.repo}`)

  const status = runGit(matchedRoot, ["status", "--porcelain", "--", entry.path]).stdout
  if (status) throw new Error(`Refusing to lock dirty source for ${entry.name}: ${matchedRoot}/${entry.path}`)

  const commit = runGit(matchedRoot, ["rev-parse", "HEAD"]).stdout
  const sourceDir = path.join(matchedRoot, entry.path)
  validateSkillFile(sourceDir, entry.name)
  skills.push({
    type: "external",
    name: entry.name,
    repo: entry.repo,
    commit,
    path: entry.path,
    skillMdSha256: normalizedSkillFileSha256(path.join(sourceDir, "SKILL.md")),
  })
}

writeJson(lockPath, { version: 1, resources, skills })
console.log(`Updated ${lockPath}`)
