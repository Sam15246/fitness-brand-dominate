import type { Metadata } from "next";

import { AuthShell, ForgotPasswordForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Forgot Password | DOMINATE",
  description: "Request a password reset for your DOMINATE account",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot Password" subtitle="Enter your email to receive a reset link.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
