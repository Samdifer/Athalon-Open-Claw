// BUG-SM-107: This file previously used Next.js App Router error boundary
// conventions (export default function Error({ error, reset })). In a Vite +
// React Router app, those conventions are inert — the file was never rendered
// by any error boundary. The AppLayout uses React Suspense for lazy route
// loading, and React error boundaries must be explicit class components or
// use a library like react-error-boundary.
//
// Removed dead code. Error handling for the dashboard is provided by the
// Suspense fallback in AppLayout and the per-widget loading/error states
// within DashboardPage itself.
export {};
