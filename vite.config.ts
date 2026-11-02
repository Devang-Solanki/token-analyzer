import { existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.resolve(__dirname)

/**
 * Serve /docs as /docs/index.html.
 *
 * Vite's dev and preview servers rewrite any unmatched path to the root
 * index.html, so a second entry is only reachable with a trailing slash -
 * /docs silently returns the homepage. This runs before that fallback and
 * resolves an extensionless path to its directory index, the way a static
 * host does.
 */
function directoryIndex(base: string): Connect.NextHandleFunction {
  return (req, _res, next) => {
    const [pathname, query] = (req.url ?? '/').split('?')
    const suffix = query ? `?${query}` : ''
    if (path.extname(pathname)) return next()

    // A directory with its own index.html, the way a static host resolves it.
    const candidate = path.join(base, pathname, 'index.html')
    if (candidate.startsWith(base) && existsSync(candidate)) {
      req.url = `${pathname.replace(/\/$/, '')}/index.html${suffix}`
      return next()
    }

    // The docs panes are real paths with no file of their own until the
    // pre-render step writes them, so in dev they all load the docs entry.
    // This has to cover the trailing-slash form too: that is what every link
    // uses, and without it the request falls through to the root index.html
    // and silently serves the analyzer.
    if (pathname === '/docs' || pathname.startsWith('/docs/')) {
      req.url = `/docs/index.html${suffix}`
    }
    next()
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'directory-index',
      configureServer(server) {
        server.middlewares.use(directoryIndex(root))
      },
      configurePreviewServer(server) {
        server.middlewares.use(directoryIndex(path.join(root, 'dist')))
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        docs: path.resolve(__dirname, 'docs/index.html'),
      },
    },
  },
})
