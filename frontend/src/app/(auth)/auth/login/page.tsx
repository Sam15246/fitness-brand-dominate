import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell, LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign In | DOMINATE",
  description: "Sign in to your DOMINATE account",
};

export default function LoginPage() {
  return (
    <AuthShell title="Sign In" subtitle="Access your DOMINATE account.">
      <Suspense fallback={<div className="text-sm text-[#d4c4a7]">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
