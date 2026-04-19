import type { InputHTMLAttributes } from "react";

export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73] ${className}`.trim()}
      {...props}
    />
  );
}
