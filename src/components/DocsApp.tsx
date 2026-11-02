import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { PROVIDERS } from '@/providers';
import { docsHref, docsPane } from '@/lib/routes';
import type { Provider } from '@/providers';

/** Prose sections, kept alongside the provider sections in one nav. */
const TOPICS = [
  { id: 'overview', label: 'Overview' },
  { id: 'browser', label: 'Why your browser' },
  { id: 'contribute', label: 'Adding a provider' },
] as const;

type PaneId = string;

const SITE = 'https://token.devanghacks.in';

function currentPane(): PaneId {
  return docsPane(
    window.location.pathname,
    (slug) => TOPICS.some((t) => t.id === slug) || PROVIDERS.some((p) => p.id === slug)
  );
}

function paneMeta(pane: PaneId): { title: string; description: string } {
  const provider = PROVIDERS.find((p) => p.id === pane);
  if (provider) {
    return {
      title: `How Token Analyzer reads a ${provider.name} token`,
      description: `${provider.docs.summary} Every request it makes, and what ${provider.name} will not tell you.`,
    };
  }
  if (pane === 'browser') {
    return {
      title: 'Why Token Analyzer runs in your browser',
      description:
        'A token is a live credential, so the page asks the provider directly and nothing reaches a server of ours. That also decides which services can be supported at all.',
    };
  }
  if (pane === 'contribute') {
    return {
      title: 'Adding a provider to Token Analyzer',
      description:
        'A provider is one file: recognise the token format, call the service, return the common report shape. Check the service permits a browser request first.',
    };
  }
  return {
    title: 'How Token Analyzer reads HuggingFace, GitHub and GitLab tokens',
    description:
      'Which endpoints each provider is asked, how a verdict is reached, and what each one will not tell you about a token.',
  };
}

/** Keeps the head in step with the pane, and gives the pre-render its source. */
function useDocumentMeta(pane: PaneId) {
  useEffect(() => {
    const { title, description } = paneMeta(pane);
    document.title = `${title} — Token Analyzer`;

    const set = (selector: string, attr: string, value: string) => {
      document.querySelector(selector)?.setAttribute(attr, value);
    };
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:title"]', 'content', title);
    set('link[rel="canonical"]', 'href', SITE + docsHref(pane));
    set('meta[property="og:url"]', 'content', SITE + docsHref(pane));

    const schema = document.getElementById('page-schema');
    if (schema) {
      schema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description,
        url: SITE + docsHref(pane),
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'Token Analyzer', url: SITE + '/' },
        author: { '@type': 'Person', name: 'Devang Solanki', url: 'https://devanghacks.in' },
      });
    }
  }, [pane]);
}

export function DocsApp() {
  const [pane, setPane] = useState<PaneId>(currentPane);
  useDocumentMeta(pane);

  useEffect(() => {
    const sync = () => setPane(currentPane());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const provider = PROVIDERS.find((p) => p.id === pane);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader docsActive />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12">
        <nav aria-label="Documentation" className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-10">
            <NavGroup label="About" items={TOPICS.map((t) => ({ id: t.id, label: t.label }))} pane={pane} />
            <NavGroup
              label="Providers"
              items={PROVIDERS.map((p) => ({ id: p.id, label: p.name }))}
              pane={pane}
              className="mt-7"
            />
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          {provider ? <ProviderPane provider={provider} /> : <TopicPane id={pane} />}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

function NavGroup({
  label,
  items,
  pane,
  className = '',
}: {
  label: string;
  items: { id: string; label: string }[];
  pane: PaneId;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="data-label">{label}</p>
      <ul className="mt-2.5 flex flex-wrap gap-px lg:block">
        {items.map((item) => {
          const active = item.id === pane;
          return (
            <li key={item.id}>
              <a
                href={docsHref(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`block px-3 py-2 text-[0.8125rem] transition-colors ${
                  active
                    ? 'bg-card font-medium text-accent-text sev-rail sev sev-contained'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaneTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="max-w-[24ch] text-[clamp(1.75rem,4.2vw,2.75rem)] font-medium leading-[1.08] tracking-[-0.02em]">
      {children}
    </h1>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose-width mt-5 space-y-4 text-[0.875rem] leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mono bg-secondary px-1 py-0.5 text-[var(--code-ink)]">{children}</code>
  );
}

function TopicPane({ id }: { id: string }) {
  if (id === 'browser') {
    return (
      <>
        <PaneTitle>Why it runs in your browser</PaneTitle>
        <Prose>
          <p>
            A token is a live credential. Sending one to a third-party server to be inspected
            means trusting that server not to log it, so this page does the asking itself: the
            requests go from your browser straight to the provider, and the token never reaches
            any machine of ours. There is no backend to trust because there is no backend.
          </p>
          <p>
            That is also the limit on which services can be supported. A provider has to allow a
            cross-origin request carrying an <Code>Authorization</Code> header, and that is the
            provider&rsquo;s decision, not ours. npm, Docker Hub and several others refuse it
            outright. The honest answer there is that they are unsupported, rather than quietly
            routing your credential through a proxy.
          </p>
          <p>
            Nothing from the token is kept. It lives in a variable while the tab is open and
            reloading clears it. The only thing this site stores in your browser is which theme
            you picked, and the only thing it records is an anonymous page view through Umami,
            which never sees the token or anything read with it.
          </p>
        </Prose>
      </>
    );
  }

  if (id === 'contribute') {
    return (
      <>
        <PaneTitle>Adding a provider</PaneTitle>
        <Prose>
          <p>
            A provider is one file: recognise the token format, call the service, return the
            common report shape. No component changes are needed - this page and the supported
            cells on the homepage are generated from the registry, and the filters on the Access
            tab are built from whatever the listing returns.
          </p>
          <p>
            Check first whether the service permits a browser request at all. If the preflight
            below does not come back with an allowed origin and <Code>authorization</Code> among
            the allowed headers, it cannot be supported here.
          </p>
          <pre className="overflow-x-auto bg-card p-4 text-[0.8125rem] leading-relaxed text-foreground">
            <code className="mono">{`curl -s -i -X OPTIONS https://api.example.com/whoami \\
  -H "Origin: https://token.devanghacks.in" \\
  -H "Access-Control-Request-Method: GET" \\
  -H "Access-Control-Request-Headers: authorization" \\
  | grep -i '^access-control-'`}</code>
          </pre>
          <p>
            Anything a provider cannot determine must be represented as unknown rather than
            defaulted. The interface and three worked examples are in{' '}
            <a
              href="https://github.com/Devang-Solanki/token-analyzer/tree/main/src/providers"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              src/providers
            </a>
            .
          </p>
        </Prose>
      </>
    );
  }

  return (
    <>
      <PaneTitle>How this reads a token</PaneTitle>
      <Prose>
        <p>
          You paste an access token. The page asks the service that issued it what the token can
          do, and turns the answer into one verdict, a list of findings ordered by severity, and
          the accounts and repositories it reaches.
        </p>
        <p>
          It is built for the moment you are holding a credential and need to know how bad it is
          - a key found in a repository, a token in a CI log, your own secret during an audit.
          The question it answers is not &ldquo;is this valid&rdquo; but &ldquo;what would
          someone do with it&rdquo;.
        </p>
      </Prose>

      <p className="data-label mt-8">Supported providers</p>
      <ul className="mt-2.5 grid gap-px sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <li key={provider.id} className="bg-card p-4">
            <a href={docsHref(provider.id)} className="display font-medium text-accent-text">
              {provider.name}
            </a>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.formats.map((format) => (
                <Badge key={format} className="mono normal-case tracking-normal">
                  {format}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProviderPane({ provider }: { provider: Provider }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <PaneTitle>{provider.name}</PaneTitle>
        <a
          href={provider.tokenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-accent-text"
        >
          Create a token <span aria-hidden="true">&#8599;</span>
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.formats.map((format) => (
          <Badge key={format} className="mono normal-case tracking-normal">
            {format}
          </Badge>
        ))}
      </div>

      <Prose>
        <p>{provider.docs.summary}</p>
        {provider.formatNote && <p>{provider.formatNote}</p>}
      </Prose>

      <p className="data-label mt-9">What it asks for</p>
      <ul className="mt-2.5 space-y-px">
        {provider.docs.endpoints.map((endpoint) => (
          <li
            key={endpoint.call}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-card px-4 py-2.5"
          >
            <code className="mono text-[0.8125rem] text-[var(--code-ink)]">{endpoint.call}</code>
            <span className="text-[0.8125rem] text-muted-foreground">{endpoint.purpose}</span>
          </li>
        ))}
      </ul>

      <p className="data-label mt-9">What it cannot tell you</p>
      <ul className="prose-width mt-2.5 space-y-3">
        {provider.docs.limits.map((limit) => (
          <li
            key={limit}
            className="border-l-2 border-rule-strong pl-3.5 text-[0.875rem] leading-relaxed text-muted-foreground"
          >
            {limit}
          </li>
        ))}
      </ul>
    </>
  );
}
