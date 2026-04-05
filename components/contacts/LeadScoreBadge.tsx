import { cn, getLeadScoreColor } from '@/lib/utils'

export function LeadScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        getLeadScoreColor(score)
      )}
    >
      {score}
    </span>
  )
}
