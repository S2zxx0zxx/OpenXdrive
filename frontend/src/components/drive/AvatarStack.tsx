// Only render neutral local indicators: never load arbitrary example faces
// from a third-party avatar service, or imply demo users are real people.
export function AvatarStack({ count }: { count: number }) {
  const visible = Math.min(4, Math.max(0, Math.floor(count)))
  const remaining = Math.max(0, Math.floor(count) - visible)

  return (
    <div className="flex -space-x-2" aria-label={`${count} members`}>
      {Array.from({ length: visible }, (_, index) => (
        <span
          key={index}
          className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[9px] font-semibold text-white"
          aria-hidden="true"
        >
          {index + 1}
        </span>
      ))}
      {remaining > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-slate-600 px-0.5 text-[8px] font-semibold text-white" aria-hidden="true">+{remaining}</span>}
    </div>
  )
}
