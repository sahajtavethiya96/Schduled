import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowUp, ArrowDown } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

const statValueVariants = cva('text-2xl font-bold tabular-nums', {
  variants: {
    tone: {
      default:  'text-primary',
      positive: 'text-success-content',
      negative: 'text-error',
      neutral:  'text-base-content',
    },
  },
  defaultVariants: { tone: 'default' },
})

const statIconWrapVariants = cva(
  'flex size-10 shrink-0 items-center justify-center [&_svg]:size-5',
  {
    variants: {
      tone: {
        default:  'bg-primary/10 text-primary',
        positive: 'bg-[var(--success-subtle)] text-success-content',
        negative: 'bg-error/10 text-error',
        neutral:  'bg-base-200 text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

interface StatTrend {
  value: number
  label?: string
}

interface StatProps extends VariantProps<typeof statValueVariants> {
  label: string
  value: React.ReactNode
  sublabel?: string
  icon?: React.ReactNode
  trend?: StatTrend
  className?: string
}

function Stat({ label, value, sublabel, icon, trend, tone = 'default', className }: StatProps) {
  const trendUp = trend && trend.value >= 0

  return (
    <div
      data-slot="stat"
      className={cn('flex flex-col gap-4 border border-base-300 bg-base-100 p-6', className)}
    >
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {icon && <span className={statIconWrapVariants({ tone })}>{icon}</span>}
      </div>

      {/* Value + sublabel */}
      <div>
        <p className={statValueVariants({ tone })}>{value}</p>
        {sublabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>

      {/* Optional trend indicator */}
      {trend && (
        <div className="flex items-center gap-1">
          {trendUp ? (
            <ArrowUp className="size-3.5 text-success-content" />
          ) : (
            <ArrowDown className="size-3.5 text-error" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              trendUp ? 'text-success-content' : 'text-error',
            )}
          >
            {trendUp ? '+' : ''}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  )
}

export { Stat }
export type { StatProps, StatTrend }
