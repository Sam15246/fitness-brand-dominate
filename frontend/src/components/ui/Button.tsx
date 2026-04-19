import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:opacity-60";
  const style =
    variant === "outline"
      ? "border border-[#8b6f47]/60 text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
      : "bg-[#c89e65] text-[#1d150e] hover:bg-[#ddb684]";

  return <button className={`${base} ${style} ${className}`.trim()} {...props} />;
}
