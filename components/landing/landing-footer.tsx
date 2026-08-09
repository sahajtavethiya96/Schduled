'use client'

import Link from 'next/link'
import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import { Logo } from '@/components/logo'
import { Reveal } from '@/components/landing/reveal'

const SOCIAL = [
  { icon: XLogo,         href: 'https://twitter.com',   label: 'X' },
  { icon: LinkedinLogo,  href: 'https://linkedin.com',  label: 'LinkedIn' },
  { icon: FacebookLogo,  href: 'https://facebook.com',  label: 'Facebook' },
  { icon: InstagramLogo, href: 'https://instagram.com', label: 'Instagram' },
  { icon: YoutubeLogo,   href: 'https://youtube.com',   label: 'YouTube' },
]

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      ['Features',     '/#features'],
      ['How It Works', '/#how-it-works'],
      ['FAQ',          '/#faq'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About',   '/about'],
      ['Contact', '/contact'],
      ['Privacy', '/privacy'],
      ['Terms',   '/terms'],
      ['Cookies', '/cookies'],
    ],
  },
] as const

const BOTTOM_LINKS = [
  ['Privacy', '/privacy'],
  ['Terms',   '/terms'],
  ['Cookies', '/cookies'],
] as const

export function LandingFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-12 xl:px-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

          {/* Brand — slides in from left */}
          <Reveal direction="left" delay={0}>
            <Logo variant="full" size="lg" href="/" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Schduled helps teams schedule meetings, manage availability and automate bookings — completely free, forever.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center border border-base-300 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Icon size={18} weight="fill" />
                </a>
              ))}
            </div>
          </Reveal>

          {/* Link columns — stagger up */}
          {FOOTER_COLS.map((col, i) => (
            <Reveal key={col.title} direction="up" delay={100 + i * 100}>
              <h4 className="mb-4 text-xs font-black uppercase tracking-eyebrow text-base-content">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-base-content"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        {/* Bottom bar — fades up last */}
        <Reveal direction="up" delay={400}>
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-base-300 pt-8 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Schduled. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {BOTTOM_LINKS.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="text-xs text-muted-foreground transition-colors hover:text-base-content"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}
