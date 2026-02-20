import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { RoleSelector } from "@/components/onboarding/role-selector";
import authOptions from "@/lib/auth/options";

export default async function RoleSelectionPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/sign-in");
  }

  // @ts-ignore - UserRole might be missing in client generation
  if (session.user.role !== UserRole.UNSET) {
    // @ts-ignore
    const destination = session.user.role === UserRole.RECRUITER ? "/dashboard/recruiter" : "/dashboard/student";
    redirect(destination);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-background font-sans">
      <div className="w-full max-w-2xl space-y-8 bg-card p-10 rounded-3xl shadow-craft border border-border/40 text-center">
        <header className="space-y-4">
          <h1 className="font-serif text-3xl text-foreground">Choose your experience</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Pathwise tailors dashboards for students and recruiters. Select the option that aligns with how you plan to use the platform.
          </p>
        </header>
        <RoleSelector />
      </div>
    </div>
  );
}
