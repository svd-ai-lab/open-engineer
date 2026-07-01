---
name: research-paper-data
description: Search scholarly literature and research data without a private backend, including OpenScience's public API metadata/OA workflow and the bundled nature-skills OpenAlex fallback search. Use when the user asks for paper search, topic or author literature discovery, DOI/arXiv/PMID/PMCID lookup, dataset DOI metadata, legal open-access PDF or full-text discovery, references, citations, related work, paper metadata, or evidence-backed literature triage.
---

# Research Paper Data

## Overview

Use this skill to search scholarly metadata, resolve persistent identifiers,
and find legal open-access full text using public sources or user-provided
optional credentials. This OpenScience version has no Huanjing/Sim Studio
backend, no shared token, and no private proxy.

OpenScience also bundles a public, no-MCP search fallback adapted from
`Yuan1z0825/nature-skills`: `scripts/academic_search.py`. Use it for topic
search, author search, affiliation disambiguation, ORCID lookup, or ranked
OpenAlex discovery before resolving individual identifiers through the
source-policy workflow below. This OpenScience copy falls back to Crossref for
plain topic searches if OpenAlex is temporarily unavailable.

For endpoint details and example requests, read `references/public-apis.md`
when you need to call a source directly or debug a source-specific response.

## Source Policy

Default public sources:

- Crossref for article, book, proceedings, and reference metadata.
- arXiv for preprints and arXiv PDFs.
- Europe PMC for PMID, PMCID, biomedical metadata, and OA links.
- DataCite for dataset and non-article DOI metadata fallback.
- OpenAlex discovery through `scripts/academic_search.py` for broad topic,
  author, affiliation, ORCID, and citation-aware search. Treat OpenAlex results
  as discovery candidates; resolve selected DOI/arXiv/PMID records through the
  authoritative source path above before claiming metadata or OA availability.
- Crossref fallback inside `scripts/academic_search.py` for plain topic search
  when OpenAlex returns an HTTP/network/non-JSON failure.

Optional user-configured sources:

- Use Unpaywall only when `UNPAYWALL_EMAIL` is set.
- For polite OpenAlex/Crossref pool access, pass `--mailto` to
  `scripts/academic_search.py` or set `OPENALEX_MAILTO`,
  `CROSSREF_MAILTO`, or `OPENSCIENCE_CONTACT_EMAIL` when available.
- Use any future user-provided OpenAlex enhanced/citation configuration only
  when the user has explicitly configured it. If it is absent, continue with
  public defaults and say that enhanced citation/reference lookup was skipped.

Never use Sci-Hub, paywall bypass, scraped credentials, private CORE keys,
Huanjing/Sim Studio research APIs, hidden Elsevier/CORE credentials, or any
OpenScience backend proxy.

## Workflow

1. Classify the request.
   - Natural-language topic search: run `scripts/academic_search.py` first for
     ranked OpenAlex discovery when a local Python runtime is available; then
     query Crossref, arXiv, Europe PMC, or DataCite to resolve the selected
     identifiers and source-specific metadata.
   - Author search or author disambiguation: run `scripts/academic_search.py`
     with `--author`, `--affiliation`, `--orcid`, `--author-id`, or
     `--list-authors`; report ambiguity instead of guessing.
   - DOI: normalize and query Crossref; if the item looks like a dataset,
     software, preprint, or Crossref fails, fall back to DataCite.
   - arXiv ID: query arXiv and construct the canonical abstract and PDF URLs.
   - PMID or PMCID: query Europe PMC.
   - Citation/reference graph: use Crossref references when available; use
     OpenAlex discovery signals as candidate context; do not present citation
     relationships as exhaustive unless a configured source proves them.
2. Return compact metadata with provenance.
   - Include title, authors, year, venue/container, identifier, source name,
     source URL, and confidence notes.
   - Mark ambiguous matches and do not collapse multiple plausible papers into
     one answer.
3. Find legal full text.
   - Prefer arXiv PDFs for arXiv records.
   - Prefer Europe PMC OA links for PMCID/biomedical records.
   - Use Unpaywall only with `UNPAYWALL_EMAIL`.
   - Otherwise report legal OA links found in source metadata, or state that no
     legal open full text was found.
4. Handle missing optional configuration explicitly.
   - If `UNPAYWALL_EMAIL` is absent, say Unpaywall OA discovery was skipped.
   - If no polite OpenAlex contact is configured, the bundled script may use its
     default contact; for repeated or batch search, ask the user for a mailto.
   - If enhanced citation/reference credentials are absent, say enhanced
     citation/reference lookup was skipped.
5. Keep output auditable.
   - Cite each source endpoint or record URL used.
   - Separate metadata, OA full-text candidates, citation/reference data, and
     unresolved questions.

## Query Hygiene

- Use conservative result limits first, usually 5 to 10 records.
- Prefer `python scripts/academic_search.py "<query>" --limit 5 --compact`
  for broad discovery smoke tests and quick triage. Use JSON output for
  downstream parsing.
- URL-encode user queries and identifiers.
- Respect rate limits and retry-after headers.
- Prefer HTTPS JSON APIs. For arXiv, parse Atom/XML carefully and preserve the
  `id`, `published`, `updated`, authors, categories, and PDF link.
- For Crossref, include a polite contact email only if the user has configured
  `OPENSCIENCE_CONTACT_EMAIL`; otherwise do not invent one.
- For DOI comparisons, normalize by removing URL prefixes and lowercasing the
  DOI string.

## Nature-Search Fusion

OpenScience v0 does not expose `nature-academic-search` as a separate bundled
skill. Its public, stdlib-only OpenAlex fallback has been merged here so
ordinary "search papers" requests have one predictable entry point.

Do not use or imply unavailable MCP tools unless the user has installed and
configured them separately. Do not call Scopus, ScienceDirect, Web of Science,
Google Scholar scraping, CNKI, or publisher account routes by default. If the
user explicitly wants an institution-licensed or account-backed source, ask for
confirmation and use only the user's local configuration, never an OpenScience
shared key or proxy.

## Response Shape

For searches, provide:

- `Best matches`: short ranked list with title, year, authors, venue, DOI or
  other identifier, and source.
- `Full text`: legal PDF/full-text candidates or a clear "not found" statement.
- `Coverage notes`: skipped optional sources, ambiguity, rate limits, or source
  failures.
- `Next step`: one focused recommendation, such as resolving one DOI, searching
  arXiv variants, or downloading an OA PDF with user approval.

For identifier resolution, provide one record when confident, or a small
candidate set when not confident. Never fabricate abstracts, citations, PDFs,
or author names when the source does not provide them.
