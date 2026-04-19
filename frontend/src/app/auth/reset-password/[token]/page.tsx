import type { Metadata } from "next";

import { AuthShell, ResetPasswordForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Reset Password | DOMINATE",
  description: "Set a new password for your DOMINATE account",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthShell title="Reset Password" subtitle="Choose a strong new password.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
