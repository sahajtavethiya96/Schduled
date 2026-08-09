'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

const NAV_LINKS = [
  ['Features',     '/#features'],
  ['How It Works', '/#how-it-works'],
  ['FAQ',          '/#faq'],
  ['About',        '/about'],
  ['Contact',      '/contact'],
] as const

const ease = [0.22, 1, 0.36, 1] as const

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-50 h-[72px] border-b transition-all duration-[250ms] ease-out',
        scrolled
          ? 'border-[#E5E7EB] bg-white/[0.96] backdrop-blur-[20px]'
          : 'border-transparent bg-white/[0.86] backdrop-blur-[14px]'
      )}
      initial={reduceMotion ? false : { opacity: 0, y: -28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
    >
      {/* Subtle underline that fades in on scroll */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] transition-opacity duration-[250ms]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.06) 80%, transparent 100%)',
          opacity: scrolled ? 1 : 0,
        }}
      />

      <div className="mx-auto grid h-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-12 xl:px-20">

        {/* Left: logo — slides in from left */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease }}
        >
          <Logo variant="full" size="lg" href="/" />
        </motion.div>

        {/* Center: nav — links stagger down */}
        <motion.nav
          className="hidden items-center gap-8 md:flex"
          initial="hidden"
          animate="visible"
          variants={reduceMotion ? {} : {
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
          }}
        >
          {NAV_LINKS.map(([label, href]) => (
            <motion.div
              key={label}
              variants={reduceMotion ? {} : {
                hidden:  { opacity: 0, y: -12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
              }}
            >
              <Link
                href={href}
                className="text-sm font-medium text-base-content/60 transition-colors duration-200 hover:text-base-content"
              >
                {label}
              </Link>
            </motion.div>
          ))}
        </motion.nav>

        {/* Right: sign in + CTA — slides in from right */}
        <motion.div
          className="flex items-center justify-end gap-2"
          initial={reduceMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease }}
        >
          <Link
            href="/login"
            className="hidden px-4 py-2 text-sm font-medium text-base-content/55 transition-colors duration-200 hover:text-base-content sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
          >
            Get Started Free <ArrowRight size={13} weight="bold" />
          </Link>
        </motion.div>

      </div>
    </motion.header>
  )
}
