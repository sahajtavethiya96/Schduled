'use client'

import { MagnifyingGlass, Spinner } from '@phosphor-icons/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

interface Props {
  paramKey: string
  pageKey: string
  placeholder?: string
  initialValue?: string
}

export function SectionSearch({ paramKey, pageKey, placeholder = 'Search…', initialValue = '' }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(initialValue)
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setValue(searchParams.get(paramKey) ?? '')
  }, [searchParams, paramKey])

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = next.trim()
    if (trimmed) params.set(paramKey, trimmed)
    else params.delete(paramKey)
    params.delete(pageKey)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  function onChange(next: string) {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(next), 350)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (timer.current) clearTimeout(timer.current); push(value) }}
      className="relative flex items-center"
    >
      {isPending ? (
        <Spinner size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
      ) : (
        <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-none border border-base-300 bg-page pl-8 pr-3 text-sm text-base-content placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-56"
      />
    </form>
  )
}
