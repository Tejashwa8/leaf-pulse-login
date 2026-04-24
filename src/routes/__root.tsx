import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { InstallPrompt } from "@/components/InstallPrompt";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "LeafRx — Your Plant's Digital Doctor" },
      { name: "description", content: "AI-powered plant disease detection. Snap a leaf, get an instant diagnosis and treatment prescription." },
      { name: "author", content: "LeafRx" },
      { name: "theme-color", content: "#1a2e1a" },
      { name: "application-name", content: "LeafRx" },
      // iOS — install as standalone app
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "LeafRx" },
      // Windows tiles
      { name: "msapplication-TileColor", content: "#1a2e1a" },
      { name: "msapplication-config", content: "/browserconfig.xml" },
      // Open Graph / Twitter
      { property: "og:title", content: "LeafRx — Your Plant's Digital Doctor" },
      { property: "og:description", content: "AI-powered plant disease detection. Snap a leaf, get an instant diagnosis and treatment prescription." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icons/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icons/icon-512.png" },
      { name: "twitter:title", content: "LeafRx — Your Plant's Digital Doctor" },
      { name: "twitter:description", content: "AI-powered plant disease detection. Snap a leaf, get an instant diagnosis and treatment prescription." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // PWA manifest
      { rel: "manifest", href: "/manifest.json" },
      // Favicons
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      // iOS touch icons (iPhone, iPad)
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-icon-180.png" },
      { rel: "apple-touch-icon", sizes: "167x167", href: "/icons/apple-icon-167.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/icons/apple-icon-152.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/icons/apple-icon-120.png" },
      // macOS Safari pinned tab / mask
      { rel: "mask-icon", href: "/icons/icon-512.png", color: "#1a2e1a" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <InstallPrompt />
    </>
  );
}
