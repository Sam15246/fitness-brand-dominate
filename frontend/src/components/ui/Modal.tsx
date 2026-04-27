import type { ReactNode } from "react";

type ModalProps = {
  title?: string;
  children: ReactNode;
};

export default function Modal({ title, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#8b6f47]/40 bg-[#14100d] text-[#f4eee4] shadow-2xl">
        {title ? <div id="modal-title" className="border-b border-[#8b6f47]/30 px-5 py-4 text-xs uppercase tracking-[0.2em] text-[#c7ac85]">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
