import type { Metadata } from "next";

import { AuthShell, RegisterForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Register | DOMINATE",
  description: "Create your DOMINATE account",
};

export default function RegisterPage() {
  return (
    <AuthShell title="Create Account" subtitle="Join DOMINATE and start your training journey.">
      <RegisterForm />
    </AuthShell>
  );
}
