import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell, RegisterForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Register | DOMINATE",
  description: "Create your DOMINATE account",
};

export default function RegisterPage() {
  return (
    <AuthShell title="Create Account" subtitle="Join DOMINATE and start your training journey.">
      <Suspense fallback={<div className="text-sm text-[#d4c4a7]">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
