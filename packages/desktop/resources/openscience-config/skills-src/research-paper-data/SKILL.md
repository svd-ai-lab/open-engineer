---
name: research-paper-data
description: Search scholarly literature and research data without a private backend. Use when the user asks for paper search, DOI/arXiv/PMID/PMCID lookup, dataset DOI metadata, legal open-access PDF or full-text discovery, references, citations, related work, paper metadata, or evidence-backed literature triage.
---

# Research Paper Data

## Overview

Use this skill to search scholarly metadata, resolve persistent identifiers,
and find legal open-access full text using public sources or user-provided
optional credentials. This OpenScience version has no Huanjing/Sim Studio
backend, no shared token, and no private proxy.

For endpoint details and example requests, read `references/public-apis.md`
when you need to call a source directly or debug a source-specific response.

## Source Policy

Default public sources:

- Crossref for article, book, proceedings, and reference metadata.
- arXiv for preprints and arXiv PDFs.
- Europe PMC for PMID, PMCID, biomedical metadata, and OA links.
- DataCite for dataset and non-article DOI metadata fallback.

Optional user-configured sources:

- Use Unpaywall only when `UNPAYWALL_EMAIL` is set.
- Use OpenAlex enhanced coverage or citation/reference checks only when
  `OPENALEX_API_KEY` is set. If the key is absent, explain that the optional
  OpenAlex path is unavailable and continue with public defaults.

Never use Sci-Hub, paywall bypass, scraped credentials, private CORE keys,
Huanjing/Sim Studio research APIs, or any OpenScience backend proxy.

## Workflow

1. Classify the request.
   - Natural-language topic search: query Crossref first, then arXiv or Europe
     PMC when the domain fits.
   - DOI: normalize and query Crossref; if the item looks like a dataset,
     software, preprint, or Crossref fails, fall back to DataCite.
   - arXiv ID: query arXiv and construct the canonical abstract and PDF URLs.
   - PMID or PMCID: query Europe PMC.
   - Citation/reference graph: use Crossref references when available; use
     OpenAlex only when the user has configured `OPENALEX_API_KEY`.
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
   - If `OPENALEX_API_KEY` is absent, say enhanced OpenAlex citation/reference
     lookup was skipped.
5. Keep output auditable.
   - Cite each source endpoint or record URL used.
   - Separate metadata, OA full-text candidates, citation/reference data, and
     unresolved questions.

## Query Hygiene

- Use conservative result limits first, usually 5 to 10 records.
- URL-encode user queries and identifiers.
- Respect rate limits and retry-after headers.
- Prefer HTTPS JSON APIs. For arXiv, parse Atom/XML carefully and preserve the
  `id`, `published`, `updated`, authors, categories, and PDF link.
- For Crossref, include a polite contact email only if the user has configured
  `OPENSCIENCE_CONTACT_EMAIL`; otherwise do not invent one.
- For DOI comparisons, normalize by removing URL prefixes and lowercasing the
  DOI string.

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
