import { DOCS_ROOT } from '@/lib/routes';
import { useTheme } from '@/lib/theme';

/** The day/night switch from devanghacks.in. `checked` is night. */
function ThemeSwitch({ dark, onChange }: { dark: boolean; onChange: (dark: boolean) => void }) {
  return (
    <div className="theme-switch-wrap" title="Toggle light / dark theme">
      <label className="switch">
        <input
          type="checkbox"
          aria-label="Toggle light and dark theme"
          checked={dark}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className="slider round white">
          <img className="clouds cloud1" src="/theme-switch/clouds.png" alt="" />
          <img className="clouds cloud2" src="/theme-switch/clouds.png" alt="" />
          <div className="night" />
          <img className="balloon" src="/theme-switch/balloon.png" alt="" />
          <p className="star">&#10022;</p>
          <p className="star">&#10022;</p>
          <p className="star">&#10022;</p>
          <p className="star">&#10022;</p>
          <p className="star">&#10022;</p>
          <img className="spaceship" src="/theme-switch/spaceship.png" alt="" />
        </div>
      </label>
    </div>
  );
}

export function SiteHeader({ docsActive = false }: { docsActive?: boolean }) {
  const { isDark, setIsDark } = useTheme();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt=""
              width="30"
              height="28"
              className="h-[1.75rem] w-auto shrink-0"
            />
            <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-accent-text">
              [ Token Analyzer ]
            </span>
          </a>
          <a
            href={DOCS_ROOT}
            aria-current={docsActive ? 'page' : undefined}
            className={`text-[0.75rem] font-semibold uppercase tracking-[0.1em] ${
              docsActive ? 'text-foreground' : 'text-muted-foreground hover:text-accent-text'
            }`}
          >
            Docs
          </a>
          <a
            href="https://devanghacks.in"
            className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-accent-text"
          >
            devanghacks.in <span aria-hidden="true">&#8599;</span>
          </a>
        </div>
        <ThemeSwitch dark={isDark} onChange={setIsDark} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="prose-width mx-auto max-w-6xl px-4 py-8 text-[0.8125rem] leading-relaxed text-muted-foreground sm:px-6">
        <p>
          Your token is read in the browser and sent only to the service it belongs to. This page
          counts anonymous visits with Umami; that never includes your token or anything read
          with it.
        </p>
        <p className="mt-2">
          <a href={DOCS_ROOT} className="link">
            How this reads a token
          </a>{' '}
          &middot; Built for the security community.{' '}
          <a
            href="https://github.com/Devang-Solanki/token-analyzer"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
