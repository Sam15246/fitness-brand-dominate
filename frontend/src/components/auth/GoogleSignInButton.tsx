"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { loginWithGoogle } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              shape?: "rectangular" | "pill" | "circle" | "square";
              theme?: "outline" | "filled_blue" | "filled_black";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              size?: "large" | "medium" | "small";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const credential = response.credential || "";
          if (!credential) {
            setError("Google sign-in failed. Please try again.");
            return;
          }

          setError(null);
          try {
            const user = await loginWithGoogle({ credential });
            const defaultPath = ["admin", "superadmin"].includes((user.role || "").toLowerCase())
              ? "/admin/dashboard"
              : "/products";
            const nextPath = searchParams.get("next") || defaultPath;
            router.push(nextPath.startsWith("/") ? nextPath : "/products");
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Google sign-in failed");
          }
        },
        ux_mode: "popup",
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 380,
      });
      setReady(true);
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setError("Unable to load Google sign-in right now.");
    document.head.appendChild(script);

    return () => {
      if (buttonRef.current) {
        buttonRef.current.innerHTML = "";
      }
    };
  }, [router, searchParams]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex justify-center [&>div]:w-full [&>div]:!rounded-full" />
      {!ready && !error && (
        <div className="flex items-center justify-center gap-2 py-2">
          <svg className="h-4 w-4 animate-spin text-[#b5a08a]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[11px] text-[#b5a08a]">Loading Google sign-in...</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[12px] text-[#a94442]">{error}</p>
        </div>
      )}
    </div>
  );
}
