import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  description?: string
  // Accepted for backwards-compat with existing call sites, but no longer
  // rendered — page eyebrows were removed across the app.
  eyebrow?:     string
  title:        string
  action?:      ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-black text-xl text-foreground tracking-tight sm:text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 sm:pt-0.5">{action}</div>}
    </div>
  )
}
