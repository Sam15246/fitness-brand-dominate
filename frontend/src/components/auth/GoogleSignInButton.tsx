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
            router.refresh();
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
        shape: "rectangular",
        text: "continue_with",
        width: 340,
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
      // Keep loaded script cached across auth pages.
    };
  }, [router, searchParams]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex justify-center" />
      {!ready && !error ? <p className="text-center text-xs text-[#b59a73]">Loading Google sign-in...</p> : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-[#a94442]/50 bg-[#2b1414]/70 px-3 py-2 text-sm text-[#f4c2c2]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
