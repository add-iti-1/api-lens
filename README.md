# API Lens

A standalone API reader: paste one public API URL to get response-grounded
explanations, practical examples, a clickable visualizer, and a five-question quiz.

## Code

- [index.html](./index.html): page layout and styles.
- [reader.js](./reader.js): response analysis and workspace interactions.
- [vercel.json](./vercel.json): static-site deployment configuration.
- [.vercelignore](./.vercelignore): excludes local deployment metadata and this guide.

There are no dependencies, build steps, server, API keys, or environment variables.

## Run locally

Open `index.html` in a modern browser. Try **Blog posts API** or **Store API**.
For a live public endpoint, use:

```text
https://jsonplaceholder.typicode.com/posts/1
```

Public API requests go directly from the browser to the API. The provider must
allow browser requests through CORS. An HTTPS deployment may block HTTP APIs.
Only the API URL is required: there are no definition editors, source-approval
steps, documentation forms, or AI setup.

The offline samples use fictional data and illustrative `example.com` URLs.
Replace their URLs with a real endpoint before executing a copied code example.

## Workspace controls

- Switch between dark and light themes with the header button. Only your theme
  preference is saved in browser local storage; API inputs and results are not.
- Press `/` outside an input to focus the API URL field.
- Press `Ctrl+Enter` (or `Command+Enter`) in the URL field to analyze it.
- Use the workspace navigation and section bar to jump to the overview, request
  and data explanation, examples, failure guidance, visualizer, or quiz.
- Copy an endpoint or a JavaScript, Python, or cURL example with its copy button.
  Clipboard permissions depend on your browser.
- The quiz shows answered-question progress, scored feedback, and reset controls.
  Changing an answer clears stale feedback; changing endpoints starts a new quiz.
- Meet Byte in the homepage playground: send a pretend request and watch its
  round trip. This local illustration never contacts an API or depicts a real trace.
- A perfect quiz round unlocks a response-explorer badge with a brief celebration.
  Changing an answer, resetting, or changing endpoints clears the badge.
- Playful effects respect your system's reduced-motion preference. The pretend
  request completes immediately without motion when that preference is enabled.
- The highlights strip below the hero scrolls continuously from left to right.
  Pause or resume it with its button; hovering over the moving text also pauses
  it on mouse/trackpad devices. Reduced-motion mode shows a static, non-repeating
  strip instead. Repeated decorative text is hidden from screen readers.
- The original visual design is inspired by familiar developer-tool patterns.
  This project is not affiliated with GitHub.
- The homepage keeps the normal theme background with agency-style typography,
  playful notes, a neutral code-style badge, and rounded feature cards. The hero
  buttons jump to the URL field or load the offline Store API sample. No
  third-party artwork, fonts, animation libraries, or tracking scripts are used.

## Deploy to Vercel

Vercel's Hobby plan is free for eligible personal, non-commercial projects within
its usage limits. Check the current plan terms before publishing:
https://vercel.com/docs/plans/hobby

### Using the CLI

Install Node.js LTS if `node` and `npm` are not available. Open a terminal in this
folder, then run:

```powershell
npx vercel@latest login
npx vercel@latest --prod
```

Sign in through the browser, choose your personal Hobby scope, and create a project.
If asked, choose **Other** as the framework. This folder has no build/install
commands; its output directory is `.`. The included configuration sets these values.
Do not select a paid plan or add paid services for this static website.

The CLI prints a deployment URL. Open it and test both an offline demo and a public
API request before sharing it.

### Using the dashboard

1. Put the files in this folder in a Git repository and push it to a Git provider
   supported by your Vercel account.
2. Visit https://vercel.com/new and import that repository.
3. Use the repository root as the root directory.
4. Choose **Other**, leave the build/install commands empty, and use `.` as output.
   The included `vercel.json` supplies these settings.
5. Deploy under your eligible personal Hobby account.

No custom domain is needed; Vercel supplies a deployment URL.

## What the explanations mean

- The reader makes one unauthenticated GET with browser credentials omitted,
  a 15-second timeout, and a streamed 1 MB body limit.
- Purpose and use-case suggestions are interpretations of the returned fields,
  not official provider descriptions or promises of additional capabilities.
- The overview uses an OpenAPI/Swagger document's supplied name, introductory
  description, and tag descriptions when present. For ordinary responses it gives
  a brief, tentative explanation, without field counts or parser details.
- The field guide samples up to ten collection items, 40 field paths, and two
  nested object levels. Observed types and example values are not a formal schema.
- Query parameters are described as supplied, not assumed required or supported.
- HTTP errors with readable bodies are explained as error results. HTML pages,
  binary media, network failures, and oversized bodies produce explicit errors.
- Malformed JSON is reported and displayed as text; empty bodies are explained.
- Timing, decoded text size, and exposed quota headers describe this one response.
  Missing headers may be hidden by CORS and do not imply unlimited usage.
- The visualizer is conceptual, not a live execution trace. It does not assume a
  database exists or that the illustrated processing order is verified.
- The simplified reader does not expand OpenAPI documents into endpoint catalogs.
- No documentation is automatically fetched and no private AI service is used.
  Published limits, legal terms, complete schemas, and API-wide authentication
  policies cannot be established from one response.

Do not paste secrets, private API keys, or confidential data. Private credentials
should never be included in this website's source or deployment.
