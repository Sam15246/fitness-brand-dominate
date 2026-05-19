import type { ReactNode } from "react";

import Footer from "@/components/home/Footer";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import Navbar from "@/components/home/Navbar";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pb-20 md:pb-0 overflow-x-hidden">{children}</main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
