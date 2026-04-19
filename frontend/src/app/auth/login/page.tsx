import type { Metadata } from "next";

import { AuthShell, LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign In | DOMINATE",
  description: "Sign in to your DOMINATE account",
};

export default function LoginPage() {
  return (
    <AuthShell title="Sign In" subtitle="Access your DOMINATE account.">
      <LoginForm />
    </AuthShell>
  );
}
