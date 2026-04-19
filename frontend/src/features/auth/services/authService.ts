import {
  forgotPassword,
  getCurrentUser,
  login,
  loginWithGoogle,
  logout,
  register,
  resetPassword,
  type CurrentUser,
} from "@/lib/api";

export type LoginPayload = { email: string; password: string; remember?: boolean };
export type RegisterPayload = { name: string; email: string; password: string };
export type ResetPasswordPayload = { token: string; password: string; confirm_password: string };

export async function getMe(): Promise<CurrentUser> {
  return getCurrentUser();
}

export async function signIn(payload: LoginPayload): Promise<CurrentUser> {
  return login(payload);
}

export async function signInWithGoogle(credential: string): Promise<CurrentUser> {
  return loginWithGoogle({ credential });
}

export async function signOut(): Promise<void> {
  await logout();
}

export async function signUp(payload: RegisterPayload): Promise<CurrentUser> {
  return register(payload);
}

export async function requestPasswordReset(email: string): Promise<string> {
  return forgotPassword(email);
}

export async function submitPasswordReset(payload: ResetPasswordPayload): Promise<string> {
  return resetPassword(payload);
}
