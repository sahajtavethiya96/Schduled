import * as React from 'react'
import { cn } from '@/lib/utils'

function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'kbd kbd-xs font-mono font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

export { Kbd }
