'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  Navbar,
  HeroSection,
  JobCards,
  EmployerSection,
  PricingSection,
  Testimonials,
  Footer,
} from '@/components/landing';
import { Hire } from '@/components/landing/Hire';
import { Resume } from '@/components/landing/Resume';


export default function LandingPage() {
  useScrollReveal();

  return (
    <>
      <Navbar />
      <HeroSection />
      {/* <CompanyMarquee /> */}
      <JobCards />
      <EmployerSection />
      <Resume />
      <Hire />
      <PricingSection />
      <Testimonials />
      <Footer />
    </>
  );
}
