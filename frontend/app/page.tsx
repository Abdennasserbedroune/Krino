import { redirect } from "next/navigation";

/**
 * Root route "/" — redirects to the new landing page design.
 * The actual landing page lives at app/(public)/landing/page.tsx
 */
export default function Home() {
  redirect("/landing");
}
