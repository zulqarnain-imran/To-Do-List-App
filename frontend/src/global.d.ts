/**
 * Ambient declarations.
 *
 * Next generates next-env.d.ts during `next dev` / `next build`, and it is
 * gitignored. That is fine at runtime, but it means a standalone
 * `npm run typecheck` on a fresh clone would fail to resolve the stylesheet
 * side-effect import in app/layout.tsx. Declaring it here keeps typecheck
 * self-sufficient, with no dependency on having run a build first.
 */

declare module "*.css";
