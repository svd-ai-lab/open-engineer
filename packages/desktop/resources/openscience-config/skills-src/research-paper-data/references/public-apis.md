# Public Scholarly APIs

Use these public sources directly. Keep requests small, cite source URLs in the
answer, and describe source failures instead of filling gaps from memory.

## Crossref

Use for DOI and bibliographic metadata.

- Search: `https://api.crossref.org/works?query=<query>&rows=<n>`
- DOI lookup: `https://api.crossref.org/works/<doi>`
- Optional polite pool: append `mailto=<OPENSCIENCE_CONTACT_EMAIL>` when that
  environment variable is set by the user.

Useful fields: `title`, `author`, `published-print`, `published-online`,
`issued`, `container-title`, `DOI`, `URL`, `type`, `reference`, `is-referenced-by-count`.

## arXiv

Use for arXiv IDs, preprints, and arXiv PDFs.

- ID lookup: `https://export.arxiv.org/api/query?id_list=<arxiv-id>`
- Search: `https://export.arxiv.org/api/query?search_query=all:<query>&start=0&max_results=<n>`
- Abstract page: `https://arxiv.org/abs/<arxiv-id>`
- PDF: `https://arxiv.org/pdf/<arxiv-id>`

Parse Atom XML. Preserve version suffixes when they matter, but the PDF URL can
usually use the base arXiv ID.

## Europe PMC

Use for PMID, PMCID, biomedical metadata, and open full-text links.

- Search: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=<query>&format=json&pageSize=<n>`
- PMID: query `EXT_ID:<pmid> AND SRC:MED`
- PMCID: query `PMCID:<pmcid>`

Useful fields: `title`, `authorString`, `journalTitle`, `pubYear`, `doi`,
`pmid`, `pmcid`, `isOpenAccess`, `fullTextUrlList`.

## DataCite

Use as DOI metadata fallback for datasets, software, preprints, and other
non-article research objects.

- Search: `https://api.datacite.org/dois?query=<query>&page[size]=<n>`
- DOI lookup: `https://api.datacite.org/dois/<doi>`

Useful fields live under `data.attributes`: `titles`, `creators`,
`publicationYear`, `types`, `publisher`, `doi`, `url`, `descriptions`.

## Unpaywall

Use only when `UNPAYWALL_EMAIL` is set.

- DOI OA lookup: `https://api.unpaywall.org/v2/<doi>?email=<UNPAYWALL_EMAIL>`

Useful fields: `is_oa`, `oa_status`, `best_oa_location`, `oa_locations`,
`url_for_pdf`, `url_for_landing_page`, `license`.

## OpenAlex

Use only when `OPENALEX_API_KEY` is set. Prefer it for broader related-work,
citation, and reference graph checks.

- Work lookup by DOI: `https://api.openalex.org/works/https://doi.org/<doi>?api_key=<OPENALEX_API_KEY>`
- Search: `https://api.openalex.org/works?search=<query>&per-page=<n>&api_key=<OPENALEX_API_KEY>`

Useful fields: `display_name`, `authorships`, `publication_year`,
`primary_location`, `open_access`, `referenced_works`, `cited_by_count`,
`cited_by_api_url`, `doi`.

If the API key is missing, say OpenAlex was skipped and continue with Crossref,
arXiv, Europe PMC, and DataCite.
