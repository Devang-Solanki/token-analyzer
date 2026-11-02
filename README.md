<p align="center">
  <img src="public/logo.png" alt="HuggingFace Token Analyzer Logo" width="120" height="120" />
</p>

<h1 align="center">Token Analyzer</h1>

<p align="center">
  See what a HuggingFace or GitHub access token can reach.<br />
  <a href="https://token.devanghacks.in/"><strong>token.devanghacks.in</strong></a>
</p>

<p align="center">
   <a href="https://www.gnu.org/licenses/gpl-3.0.en.html/"><img src="https://img.shields.io/badge/license-GPL_3.0-_red.svg"></a>
   <a href="https://twitter.com/devangsolankii"><img src="https://img.shields.io/twitter/follow/devangsolankii.svg?logo=twitter"></a>
</p>

## ✨ Features

- **🔒 Your token stays in the browser**: it is sent to the service it belongs to and nowhere else
- **🧭 Recognises the provider from the token format**: nothing is transmitted until a provider claims it
- **⚖️ A verdict, not a dump**: one line telling you how far a leak of this token would reach
- **🔑 Permission matrix**: every permission, with the ones that can change things marked
- **🏢 Organizations**: membership, your role, and the restrictions that may block the token
- **📦 Repositories**: everything the token opens, filterable by kind, visibility and write access, and flagged when a listing is incomplete
- **🎯 Fine-grained scopes**: the exact resources a scoped token names
- **⏰ Expiry**: when it stops working, and a warning when it never does
- **📖 Documented per provider**: [`/docs`](https://token.devanghacks.in/docs) explains what
  each provider is asked and what it will not say, generated from the provider code itself
- **🌙 Light and dark**: resolved before first paint, so there is no flash

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Devang-Solanki/token-analyzer.git
cd token-analyzer

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`, with the documentation at
`http://localhost:5173/docs`.

There are two HTML entries, so `/docs` is a real path rather than a hash route. Vite's dev and
preview servers otherwise rewrite any unmatched path to the root `index.html`, which makes
`/docs` silently serve the homepage - the `directory-index` plugin in
[`vite.config.ts`](vite.config.ts) resolves extensionless paths to their directory index the way
a static host does, and sends everything under `/docs/` to the docs entry. In production
[`public/_redirects`](public/_redirects) handles the trailing slash.

`npm run build` finishes by pre-rendering. Both entries otherwise ship an empty
`<div id="root">`, so anything that does not execute JavaScript - and that includes Google's
first pass - sees a blank page, and the docs panes have no HTML at all.
[`scripts/prerender.mjs`](scripts/prerender.mjs) loads each route in a headless browser,
snapshots the rendered document and writes it back into `dist`, then emits `sitemap.xml` from the
same route list so the two cannot drift. The route list comes from the provider registry, so a
new provider gets a pre-rendered, indexed page for free. It refuses to write a route whose
render contains no `<h1>`, and skips with a warning if no browser is available rather than
publishing empty shells silently. Set `CHROME_PATH` if it cannot find one.

```bash
npm test          # 105 assertions over the provider logic
npm run prerender # re-run just the pre-render against an existing dist
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to any static hosting service.

## 🔍 How It Works

1. **Enter your HuggingFace API token** in the input field
2. **Click "Analyze token"**
3. **Read the verdict** at the top, then drill in across three tabs:
   - **Findings**: what is worth acting on, most severe first
   - **Permissions**: what the token can and cannot do, plus fine-grained scopes
   - **Access**: organizations and repositories the token reaches

### Token Types Supported

| Type | Description |
|------|-------------|
| **Read** | Read-only access to public and gated repos |
| **Write** | Read and write access to repos |
| **Admin** | Full administrative access |
| **Fine-Grained** | Custom scoped permissions |

## 🛡️ Privacy & Security

This tool is designed with privacy as a top priority:

- ✅ **No server-side processing** - the analysis runs in your browser
- ✅ **No data storage** - your token is never saved, and it is cleared when you reload
- ✅ **Open source** - audit the code yourself
- ℹ️ **Anonymous page counts** - the hosted version loads [Umami](https://umami.is) to count visits. It never receives your token or anything read with it, and self-hosted builds can drop the one `<script>` tag in `index.html`.

Token requests go directly from your browser to the provider's own API.

## 🎨 Design

Shares the design language of [devanghacks.in](https://devanghacks.in): editorial-brutalist
terminal. Space Grotesk for display, JetBrains Mono for body text, dark by default via
`data-theme` on `<html>`, zero border radius, a faint blueprint dot grid, and tracked uppercase
labels. The fonts are the same self-hosted woff2 files, so the page makes no third-party
request.

One rule is this tool's own: **hue encodes severity**. The brand accent (lime in dark, teal in
light) is used for interactive chrome only, and the severity ramp is tuned to stay clear of its
hue - `elevated` is orange rather than amber, because amber sits at the same hue as the lime
accent and a warning must never be mistakable for a button.

The light theme links in `#1a5fc4` rather than the site's `#2F89FC`, which measures 3.15:1 on
`#F5F5F5` and fails the 4.5:1 body-text floor.

## 🏗️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Space Grotesk / JetBrains Mono** - Typefaces, self-hosted from devanghacks.in
- **Lucide React** - Icons

## 📁 Project Structure

Sources that are not shipped live in `assets/`. The full-size logo original is not kept
there - it is already in git history, and `public/logo.png` is derived from it:

```bash
git show 1881b02:public/logo.png > logo-source.png
```

```
index.html                 # the analyzer
docs/index.html            # the documentation

assets/
└── og-template.html       # renders to public/og.png; see the comment at its top

scripts/
├── prerender.mjs          # post-build: real HTML per route, plus sitemap.xml
├── provider-ids.mjs       # feeds the route list from the provider registry
└── test-providers.mjs     # npm test

public/
├── 404.html               # copied from devanghacks.in, self-contained
├── _redirects             # /docs -> /docs/ on Cloudflare Pages
├── fonts/                 # the same woff2 files the main site uses
└── theme-switch/          # artwork for the day/night switch

src/
├── main.tsx               # entry point for /
├── docs.tsx               # entry point for /docs
├── index.css              # the whole token system
├── App.tsx                # the analyzer
├── components/
│   ├── SiteChrome.tsx     # header and footer, shared by both pages
│   ├── DocsApp.tsx        # the docs page, generated from the registry
│   └── ui/                # small shadcn-style primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── input.tsx
│       └── tabs.tsx
├── providers/             # one analyzer per service
│   ├── types.ts           # the TokenReport contract every provider produces
│   ├── http.ts            # shared cursor pagination
│   ├── index.ts           # registry and format detection
│   ├── huggingface.ts
│   ├── github.ts
│   └── gitlab.ts
├── lib/
│   ├── theme.ts           # theme state, shared by both pages
│   ├── time.ts            # date formatting, shared by every provider
│   └── utils.ts           # the cn() class helper
├── services/
│   └── tokenAnalyzer.ts   # the HuggingFace API layer
└── types/
    └── huggingface.ts     # HuggingFace API response types
```

## 🔌 Providers

A provider is recognised from the token's format before any request is made, so a credential
for an unsupported service is never transmitted by accident.

| Provider | Token formats | What is reported |
|---|---|---|
| **HuggingFace** | `hf_` | role, fine-grained scopes, orgs, repositories |
| **GitHub** | `ghp_`, `github_pat_`, `gho_`, `ghu_`, `ghs_`, legacy 40-hex | classic scopes, orgs, repositories, gists |
| **GitLab** | `glpat-` (plus 12 other prefixes, recognised but not introspectable) | scopes, granular scopes, groups, projects |

### Why only these

Everything runs in the browser, so a provider is only supportable if its API allows a
cross-origin request carrying an `Authorization` header. That is a property of the provider,
not a choice. npm, Docker Hub and Anthropic refuse the preflight outright; no amount of
client-side code gets around it, and adding a server-side proxy would mean your token passes
through someone else's machine, which defeats the point of the tool.

### Known limits

- **GitHub expiry is invisible.** GitHub returns it in `github-authentication-token-expiration`,
  which is not in its `Access-Control-Expose-Headers`, so a browser cannot read it. The UI says
  "Not reported" rather than guessing "never".
- **GitHub fine-grained permissions are not published.** No endpoint reports them. Establishing
  them means calling endpoints to see which succeed, which this tool will not do with a
  credential that may not be yours. Fine-grained tokens are judged by what they open instead.
- **Listings stop after 10 pages**, and a cursor header is not always readable cross-origin.
  When a listing ends early the counts carry a `+` and the UI says so, because under-reporting
  what a token reaches is worse than over-warning about it.
- **GitLab is gitlab.com only.** A token for a self-managed instance will be rejected, and the
  error says so. Supporting self-managed means asking for a host, which means sending a
  credential to a server the user names - worth doing, but not silently.
- **Most GitLab token types cannot be introspected.** Deploy, runner, job, trigger, feed, agent
  and SCIM tokens authenticate against Git, the registry or a runner rather than the REST API,
  and GitLab describes none of them. They are recognised by prefix and reported as such rather
  than called unrecognised, so nobody pastes a live credential somewhere less careful looking
  for an answer.

## 🔧 What it calls

Every request each provider makes, and why, is listed at
[`/docs`](https://token.devanghacks.in/docs) - generated from the `docs` field on each provider,
so it cannot drift from the code that makes the calls. The same page states what each provider
will not tell you and what the tool does instead.

## ➕ Adding a provider

Implement the `Provider` interface in [`src/providers/types.ts`](src/providers/types.ts) and add
it to the registry in [`src/providers/index.ts`](src/providers/index.ts). No component changes
are needed: the report, the supported-token cells on the homepage, the filters and the whole
`/docs` page are generated from the registry. Fill in the `docs` field and the provider
documents itself.

Before writing any code, check the provider actually permits a browser request:

```bash
curl -s -i -X OPTIONS https://api.example.com/whoami \
  -H "Origin: https://example.org" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  | grep -i '^access-control-'
```

You need `access-control-allow-origin` and `authorization` in `access-control-allow-headers`.
If either is missing, the provider cannot be supported without a proxy, and a proxy is not an
option here.

Anything a provider cannot determine must be represented as unknown rather than defaulted. A
confident wrong answer about a credential's reach is worse than an admitted gap.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- The logo takes after [HuggingFace](https://huggingface.co)'s own mark, with a magnifying glass
  added.
- The UI primitives follow the [shadcn/ui](https://ui.shadcn.com) idiom, hand-rolled here rather
  than installed.
- Icons from [Lucide](https://lucide.dev).

## ⚠️ Disclaimer

This tool is not affiliated with HuggingFace, GitHub or GitLab. Use at your own discretion.
Treat any token you paste here as one you are willing to rotate: the page never sends it
anywhere but the service that issued it, but a credential you have been handling is a
credential worth replacing.

---

Made with ❤️ for the Security community