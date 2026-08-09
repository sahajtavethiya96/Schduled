import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center bg-base-200 text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
      )}
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold uppercase tracking-widest">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { Empty }
export type { EmptyProps }
