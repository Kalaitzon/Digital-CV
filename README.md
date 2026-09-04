# Digital CV

An interactive CV presented as a retro Windows desktop: draggable windows, a
taskbar, a Start menu and five selectable themes. **Windows 98** is the default
look, from the startup screen through logon and into the interface; Windows XP
and three others are one click away in the Start menu.

The point of the project is not the desktop, though — it is that **no CV
content is written into the code**. You upload a PDF through a
password-protected window on the site itself; an AI model reads it into a fixed
structure, translates it into the other language, and the result is committed
back to this repository, which rebuilds the site. The interface adapts to
whatever the CV actually contains.

Built with **Vite + React 19 + TypeScript**. No UI framework and no icon
dependency: every icon is inline SVG and every colour is a CSS custom property.

---

## Quick start

```bash
npm install     # install dependencies
npm run dev     # dev server at http://localhost:5173
npm run build   # generate the missing-language PDF, type-check, build into dist/
npm run preview # serve the production build locally
```

> `npm run dev` serves the front-end only. The **Update CV** window needs the
> serverless function under `api/`, which exists only on the Vercel deployment,
> so locally it will report that the import service is unreachable. Use
> `npm run import-cv` (below) to change content while developing.

## Project structure

```
src/
  App.tsx                     desktop shell: icons, windows, taskbar, start menu
  data/
    cv.json                   ALL CV content, EN + EL — written by the import
    cv.ts                     types and typed accessors over cv.json
    apps.tsx                  registry of "programs"; also decides which appear
    themes.ts                 theme metadata (label + swatch)
    config.ts                 portfolio link + which languages have a PDF
  components/
    Window.tsx                draggable / resizable window frame
    DesktopIcon.tsx           desktop shortcut
    Taskbar.tsx               taskbar, window buttons, clock, language, credit
    StartMenu.tsx             start menu: programs, language, themes
    BootScreen.tsx            boot + logon screen (98 or XP, follows the theme)
    Icons.tsx                 inline SVG icon set
    content/CvSections.tsx    the contents of each window
    content/AdminWindow.tsx   the "Update CV" upload form
  hooks/useWindowManager.ts   open / close / focus / move / resize state
  i18n/                       language context + UI strings
  theme/ThemeContext.tsx      theme selection + persistence
  styles/themes.css           the five colour themes
  index.css                   layout and component styles
shared/
  cv-schema.js                extraction schema + prompts, shared by both paths
  providers.js                Gemini / Claude adapters behind one interface
api/
  import-cv.js                serverless endpoint behind the "Update CV" window
scripts/
  import-cv.mjs               the same import, from the command line
  make-resume-pdf.mjs         typesets the PDF for a language you did not upload
assets/fonts/                 Latin + Greek font subset used by the PDF generator
public/
  CV_EN.pdf, CV_EL.pdf        one uploaded, the other generated at build time
  favicon.svg
```

---

## How the import works

### 1. Upload

Double-click **Update CV** on the desktop (it is in the Start menu too), enter
the admin password and choose **one PDF** — Greek or English, it does not
matter which. You do not declare the language; the model reads it from the
document.

**PDF only, up to 15 pages and 3 MB.** A PDF reaches the model as the actual
page, so headings, columns and bullet nesting survive; a Word file has to be
flattened to plain text first and loses that structure. It is also the file
visitors download, so accepting anything else would publish a CV whose download
does not match what the site shows.

### 2. Extraction

The serverless function sends the PDF to the model together with a **JSON
schema** describing the exact shape of the answer — every section, every field
typed. The model does not return prose that then has to be parsed; it returns
data the interface renders directly.

Two checks run before anything is written. The model reports whether the
document is a CV at all, and the server independently verifies that at least
one degree, job, skill or project came out. If either fails, the request is
rejected with an explanation and **nothing is committed** — the published site
is left untouched.

### 3. Translation

The other language is written by a **second, separate call**.

This is not decoration. Asking one call to both read the document and produce
two languages reliably produced only one: the model treats extraction as the
task and copies the source text into the second slot. The second call never
sees the document. It receives a flat list of strings and must return the same
number of strings in the same order, so the two sides are matched by position
rather than by guesswork. A reply with the wrong length is discarded whole,
leaving the original text in place, rather than risking sentences landing under
the wrong headings.

### 4. Publish

The result is committed to this repository as `src/data/cv.json` through the
GitHub API, along with the uploaded PDF. There is no database: git provides the
storage, the history and the rollback. The commit triggers a Vercel build, and
about a minute later every visitor sees the new CV.

During that build, `scripts/make-resume-pdf.mjs` typesets a PDF for the
language you did *not* upload, from the same `cv.json` the site renders — so
the two downloads can never drift apart. Your own file is always preferred and
never overwritten.

### What the site does with the result

- **Empty sections disappear.** A CV with no volunteering has no Activities
  icon and no Start menu entry, rather than an icon that opens an empty window.
- **Contacts come only from the document**, phone number included if it is
  there. Entries with no real destination — a `tel:` with nothing after it — are
  dropped.
- **Both languages are published** and the language switcher is always
  available; English is the default.

---

## Updating from the command line

```bash
npm run import-cv -- ./CV_EN.pdf                          # one language only
npm run import-cv -- ./CV_EN.pdf --translate              # both, one translated
npm run import-cv -- --en ./CV_EN.pdf --el ./CV_GR.pdf    # both, nothing translated
```

The CLI is worth using when you want to review the diff before publishing, and
it needs no Vercel configuration at all. It differs from the site in two ways:

| | Site window | `npm run import-cv` |
| --- | --- | --- |
| Files | exactly one PDF | one, or one per language |
| Formats | `.pdf` | `.pdf`, `.docx`, `.txt`, `.md` |
| Translation | always | only with `--translate` |

**Supplying both language versions is the best result available**, because
nothing is translated at all: each language's text comes from that language's
own document, in your own words. The model works out which file is which from
the content, so mixing up the flags is harmless.

Both paths write the same `src/data/cv.json` through the same schema in
`shared/cv-schema.js`, so they cannot drift apart. Add `--dry-run` to check a
file is readable without spending tokens.

Setup, once:

1. Get an API key — either provider works:
   - **Google Gemini** at <https://aistudio.google.com/apikey> — free tier, no
     card required. Note that Google states free-tier content may be used to
     improve its products.
   - **Anthropic Claude** at <https://console.anthropic.com> — paid, and your
     data is not used for training.
2. Copy `.env.example` to `.env` and paste the key into `GEMINI_API_KEY` or
   `ANTHROPIC_API_KEY`. `.env` is git-ignored and never leaves your machine.

If both keys are present Gemini is used, because it is free. Force a choice
with `CV_PROVIDER=gemini` or `CV_PROVIDER=anthropic`.

**Manually:** edit `src/data/cv.json` directly. Every field is an `{ en, el }`
pair. The next import overwrites the whole file.

---

## Deployment (Vercel)

1. Sign in at <https://vercel.com> with your GitHub account.
2. **Add New → Project**, import this repository. Vercel detects Vite; keep the
   defaults (build `npm run build`, output `dist`).
3. Add the environment variables below under **Settings → Environment
   Variables**, then **redeploy** — variables only apply to new deployments.

| Variable | Value |
| --- | --- |
| `GEMINI_API_KEY` **or** `ANTHROPIC_API_KEY` | your AI key |
| `ADMIN_PASSWORD` | the password you will type in the site |
| `GITHUB_TOKEN` | fine-grained token, **Contents: Read and write**, this repo only |
| `GITHUB_REPO` | `owner/repository` |

Optional: `GITHUB_BRANCH` (defaults to `main`), `CV_PROVIDER`, `CV_MODEL`.

Vercel is not incidental here: the import needs a server. GitHub Pages and any
other static host will serve the desktop perfectly well, but the **Update CV**
window will not work there, because there is nowhere to run `api/import-cv.js`
and nowhere to keep a key out of the browser.

### Why the model and the timeout are what they are

The Gemini default is `gemini-flash-latest`. Flash rather than Pro is
deliberate: this is structured extraction, not reasoning, so Flash is as
accurate, several times faster and far more generous on the free tier. The
`-latest` alias rather than a pinned version is also deliberate — Google keeps
retired versions listed in the models API long after they stop answering, so a
pinned name fails one day with a confusing 404.

The function is configured for **300 seconds**, the Hobby maximum under
Vercel's Fluid compute. Reading a CV and then translating it takes two calls,
and a busy free tier adds retries; the earlier 60-second ceiling was not enough.
Waiting costs nothing, because Fluid bills active CPU time and time spent
waiting on a model is not active CPU.

---

## Security

The endpoint is public, so it is written as if it were under attack.

- The password is compared with `timingSafeEqual`, so response time reveals
  nothing about it. **Use a long random one**, and never something derivable
  from the CV the site publishes.
- Wrong attempts get a fixed 700 ms delay; five failures from one IP lock that
  IP out for fifteen minutes.
- Uploads are limited to PDF, 15 pages and 3 MB, checked before any model call.
- No secret ever reaches the browser. The AI key, the GitHub token and the
  password are read only inside the serverless function, from environment
  variables. Nothing is committed to the repository.
- The GitHub token should be fine-grained, limited to **Contents: Read and
  write** on this repository alone, so a leak cannot reach anything else.
- Anyone can open the Update CV window. Without the password it does nothing.

---

## Reusing this as a template

Everything personal lives in data, not in components. To make it yours:

1. Upload your own CV — that replaces `src/data/cv.json` and the PDFs.
2. Edit `src/data/config.ts`: set `PORTFOLIO_SITE` to your own companion site or
   `""` to remove the icon entirely, and set `PORTFOLIO_OWNER_EMAIL` to the
   address in your CV. The portfolio icon only appears when the published CV
   carries that address, so publishing someone else's CV never advertises your
   work as theirs.
3. Change the credit line in `src/i18n/strings.ts` (`copyright`).

### Adding a new window

1. Write a component in `src/components/content/CvSections.tsx`.
2. Add a title to `src/i18n/strings.ts` (English + Greek).
3. Add one entry to `ALL_APPS` in `src/data/apps.tsx`. Give it a `has` condition
   if it should disappear when the CV has no such content.
4. If it needs new data, add the field to the schema in `shared/cv-schema.js`
   and to the types in `src/data/cv.ts`. Both import paths pick it up.

The desktop, Start menu and taskbar follow automatically.

### Themes

| id            | Name                                |
| ------------- | ----------------------------------- |
| `win98`       | Windows 98 — Classic Grey (default) |
| `xp-blue`     | Windows XP — Luna Blue              |
| `xp-silver`   | Windows XP — Silver                 |
| `royale-noir` | Royale Noir (dark)                  |
| `matrix`      | Hacker Terminal (CRT green)         |

Themes are pure CSS custom properties in `src/styles/themes.css`. To add one,
copy an existing block, change the values and register it in
`src/data/themes.ts`. Language and theme choices are stored in `localStorage`,
so returning visitors keep their settings.

---

## Accessibility & compatibility

- Every interactive element is a real `<button>` or `<a>`, so keyboard
  navigation and screen readers work.
- The boot animation is skipped for visitors with `prefers-reduced-motion`.
- Windows auto-maximize on small screens; the layout works down to phone widths.
- Drag and resize use Pointer Events, so touch behaves like mouse.

## Credits

The desktop artwork — the startup emblem and the XP-style wallpaper — is drawn
in SVG for this project rather than taken from Microsoft's own assets. The
fonts under `assets/fonts/` are a Latin + Greek subset of DejaVu Sans and keep
their own licence, included alongside them in `assets/fonts/LICENSE.txt`.

Built with the assistance of Claude.

## Licence

© 2026 Ioannis Kalaitzidis. All rights reserved.

The code is published for reference and portfolio purposes; it is **not** open
source, and reuse, redeployment or derivative works need written permission.
The CV content and the personal data in it are not licensed at all. Reading the
code, quoting short excerpts with attribution, and running it locally to
evaluate it are permitted. See [LICENSE](LICENSE) for the full terms.
