# orkunkinay.github.io

Personal technical website. Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no runtime dependencies.

## Local development

Pages fetch `data/content.json`, so serve the folder over HTTP (opening files directly will not work):

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

Maintenance tasks use Node (built-ins only, no `npm install`):

```sh
node scripts/site.mjs check     # validate entries, pages, canonical URLs, internal links
node scripts/site.mjs build     # regenerate sitemap.xml and feed.xml
```

## Structure

```
index.html            home
404.html
about/ archive/ projects/ research/ writing/ tags/ search/     section pages
projects/<slug>/      one folder per project  (index.html)
research/<slug>/      one folder per publication
writing/<slug>/       one folder per article
data/content.json     single source of truth for every list, tag, search result
templates/            page templates used by the scaffolder (not deployed)
scripts/site.mjs      scaffolding, sitemap/feed generation, validation
assets/css/site.css   design tokens, base, components (one file, sectioned)
assets/js/            theme.js (blocking, no flash), site.js (entry), shell.js (header,
                      footer, theme toggle), data.js, render.js, views.js
```

How it fits together: every page is real, static HTML with its own title, description and
OpenGraph tags. The header, footer, lists, tags, search and archive are rendered by small
ES modules from `data/content.json`, so adding an entry updates every list at once.
Theme (light/dark) follows the system until the toggle is used, then persists in `localStorage`.

## Add a project

```sh
node scripts/site.mjs new project my-project "My Project"
```

This adds an entry to `data/content.json` and creates `projects/my-project/index.html`
from `templates/project.html`. Then:

1. Edit the entry in `data/content.json`: `summary`, `year`, `kind` (`product`, `research`,
   `systems`, `open-source`), `tags`, `links` (`code`, `paper`, `demo`, `pypi`...), optional `stat`,
   `featured` (shown on the home page), `feature` (sparse layout with a figure), `image`.
2. Write the sections in the page. Each `entry-section__body` is empty until you add content;
   empty sections are hidden. Append `?empty` to a page URL to preview the full structure.
3. Delete the "Placeholder page" notice, run `check` and `build`, commit.

Project numbers come from order in `data/content.json`.

## Add a publication

```sh
node scripts/site.mjs new research my-paper "Paper Title"
```

Fill in `venue`, `venueShort`, `year`, `authors` (array), `links` (`paper`, `code`) in the data
entry. On the page, add the abstract, figures, notes and BibTeX (`<pre><code>…</code></pre>` in
the Citation section). Add `"inProjects": true` to also list it in the project index.

## Add a blog post

```sh
node scripts/site.mjs new post my-post "Post Title"
```

Posts start as `"status": "draft"`: the title appears under "In development" on `/writing/`,
and is excluded from the archive, search, sitemap and RSS. Write the article inside the
`.prose` div in `writing/my-post/index.html` (the contents list is built from the `h2`s).
To publish, set `"status": "published"`, set `"date": "YYYY-MM-DD"` and a `summary`,
then run `node scripts/site.mjs build` to update the sitemap and `feed.xml`.

## Deployment (GitHub Pages)

The repository is named `orkunkinay.github.io`, so the site is served from the root.
`.github/workflows/pages.yml` runs on every push to `main`: it validates content,
regenerates the sitemap and feed, copies the public files into `_site/` (leaving out
`scripts/`, `templates/`, `.github/`) and deploys it.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
`.nojekyll` is present so files are served as-is.

## To fill in

Placeholders are marked in the UI ("Authors to be added", "Link to be added") and as `null`
in `data/content.json`: years, authors, venue details, Google Scholar / LinkedIn / CV URLs,
the biography, experience and education details, and dedicated OpenGraph images.
