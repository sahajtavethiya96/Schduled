import * as React from 'react'
import { cn } from '@/lib/utils'

const sizeClass = {
  sm: 'loading-xs',
  md: 'loading-md',
  lg: 'loading-xl',
} as const

interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizeClass
}

function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('loading loading-spinner', sizeClass[size], className)}
      {...props}
    />
  )
}

export { Spinner }
export type { SpinnerProps }
