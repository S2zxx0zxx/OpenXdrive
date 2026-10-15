import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200', className)}>
      <svg viewBox="0 0 40 40" className="h-7 w-7" role="img" aria-label="OpenXdrive logo">
        <path d="M10 10 L30 30 M30 10 L10 30" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M27 5 H35 V13" fill="none" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
