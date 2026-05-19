import type { Metadata } from "next";

import AnnouncementBar from "@/components/home/AnnouncementBar";
import CTAStrip from "@/components/home/CTAStrip";
import FAQSection from "@/components/home/FAQSection";
import Footer from "@/components/home/Footer";
import CommunitySection from "@/components/home/CommunitySection";
import GymPartnersSection from "@/components/home/GymPartnersSection";
import HeroSection from "@/components/home/HeroSection";
import HowItWorks from "@/components/home/HowItWorks";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import Navbar from "@/components/home/Navbar";
import ProductsSection from "@/components/home/ProductsSection";
import Testimonials from "@/components/home/Testimonials";
import TrustStrip from "@/components/home/TrustStrip";
import WhyDominate from "@/components/home/WhyDominate";

export const metadata: Metadata = {
  title: "DOMINATE - Train Anywhere. Dominate Everywhere.",
  description: "Premium grip tools and bodyweight equipment for serious athletes.",
};

export const revalidate = 120;

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        <HeroSection />
        <TrustStrip />

        <div className="h-9 bg-gradient-to-b from-[#fff8ec] to-[#f5e7d2]" aria-hidden="true" />
        <ProductsSection />

        <div className="h-9 bg-gradient-to-b from-[#f5e7d2] to-[#fff8ec]" aria-hidden="true" />
        <HowItWorks />

        <div className="h-9 bg-gradient-to-b from-[#fff8ec] to-[#1e1710]" aria-hidden="true" />
        <Testimonials />

        <div className="h-16 bg-gradient-to-b from-[#1e1710] to-[#f5e7d2]" aria-hidden="true" />
        <WhyDominate />

        <div className="h-9 bg-gradient-to-b from-[#f5e7d2] to-[#fff8ec]" aria-hidden="true" />
        <FAQSection />

        <div className="h-16 bg-gradient-to-b from-[#fff8ec] to-[#0d0b09]" aria-hidden="true" />
        <GymPartnersSection />

        <div className="h-16 bg-gradient-to-b from-[#0d0b09] to-[#fff8ec]" aria-hidden="true" />
        <CTAStrip />
      </main>

      <Footer />
      <MobileBottomNav />
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  );
}
