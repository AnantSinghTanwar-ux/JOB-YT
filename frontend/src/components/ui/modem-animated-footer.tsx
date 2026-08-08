"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FaInstagram, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { cn } from "@/lib/utils";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

interface ModemAnimatedFooterProps {
  brandName?: string;
  poweredByLabel?: string;
  poweredByName?: string;
  poweredByHref?: string;
  companyLinks?: FooterLink[];
  sections?: FooterSection[];
  socialLinks?: SocialLink[];
  className?: string;
}

export const ModemAnimatedFooter = ({
  brandName = "Jobyt",
  poweredByLabel = "Powered by",
  poweredByName = "SpazorLabs",
  poweredByHref = "#",
  companyLinks = [],
  sections = [],
  socialLinks = [],
  className,
}: ModemAnimatedFooterProps) => {
  return (
    <div className="w-full bg-black border-b-2 border-black" style={{ boxShadow: '0 500px 0 0 black', position: 'relative', zIndex: 10, outline: '2px solid black', outlineOffset: '-1px' }}>
      <section className={cn("relative w-full overflow-hidden bg-black", className)}>
        <footer className="relative bg-black">
        <div className="mx-auto flex max-w-7xl flex-col justify-between px-6 pt-8 pb-5 sm:px-8 sm:pb-8 lg:pt-0">
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-[auto_auto_auto_1fr] lg:gap-x-24 lg:gap-y-8">
              <div className="lg:mt-16">
                <p className="text-lg md:text-2xl font-semibold text-white leading-tight flex flex-col lg:flex-row lg:items-center">
                  <span>{poweredByLabel}</span>
                  <a href={poweredByHref} target="_blank" rel="noopener noreferrer" className="lg:ml-2 text-[#a8e02d]">
                    {poweredByName}
                  </a>
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                  {companyLinks.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className="transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {sections.map((section) => (
                <div key={section.title} className="lg:mt-16">
                  <h4 className="text-xl md:text-2xl font-semibold text-white">{section.title}</h4>
                  <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                    {section.links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} className="transition-colors hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {/* Move Socials under For Candidates on mobile/desktop as requested */}
                  {section.title === 'For Candidates' && socialLinks && socialLinks.length > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      {socialLinks.map((social) => (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-white/20 p-1.5 text-slate-200 transition-colors hover:border-[#a8e02d] hover:text-[#c3ff3d]"
                          aria-label={social.label}
                        >
                          {social.icon}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-center lg:items-start lg:justify-end lg:translate-y-12">
                <Image
                  src="/assets/FooterLogo.svg"
                  alt="Jobyt footer logo"
                  width={220}
                  height={300}
                  className="h-auto w-20 sm:w-24 lg:w-48"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="z-10 mt-8 lg:mt-12 flex items-center justify-center">
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 lg:-bottom-16 bg-gradient-to-b from-slate-100/35 via-slate-100/10 to-transparent bg-clip-text text-center text-transparent font-extrabold tracking-tight"
          style={{ fontSize: "clamp(4rem, 14vw, 12rem)" }}
        >
          {brandName.toUpperCase()}
        </div>

        <div className="pointer-events-none absolute bottom-0 h-28 w-full bg-gradient-to-t from-black via-black/90 to-black/0" />
      </footer>
    </section>
    </div>
  );
};

export const defaultJobytSocials: SocialLink[] = [
  { icon: <FaLinkedinIn className="h-4 w-4" />, href: "https://www.linkedin.com/company/jobyt-in/", label: "LinkedIn" },
  { icon: <FaInstagram className="h-4 w-4" />, href: "https://www.instagram.com/jobyt.in/", label: "Instagram" },
  { icon: <FaXTwitter className="h-4 w-4" />, href: "#", label: "Twitter" },
];
