interface MacroDonutProps {
  protein: number
  carbs: number
  fat: number
}

// Pure CSS conic-gradient donut -- no charting library needed for one chart.
export function MacroDonut({ protein, carbs, fat }: MacroDonutProps) {
  const proteinKcal = protein * 4
  const carbsKcal = carbs * 4
  const fatKcal = fat * 9
  const total = proteinKcal + carbsKcal + fatKcal

  if (total === 0) {
    return <p className="flex h-28 items-center justify-center text-sm text-slate-400">Log something to see today's macro split.</p>
  }

  const proteinPct = (proteinKcal / total) * 100
  const carbsPct = (carbsKcal / total) * 100
  const fatPct = 100 - proteinPct - carbsPct
  const carbsEnd = proteinPct + carbsPct

  const gradient = `conic-gradient(#0ea5e9 0% ${proteinPct}%, #f59e0b ${proteinPct}% ${carbsEnd}%, #8b5cf6 ${carbsEnd}% 100%)`

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0 rounded-full transition-[background] duration-500" style={{ background: gradient }}>
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{Math.round(total)} kcal</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Protein {Math.round(proteinPct)}%
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Carbs {Math.round(carbsPct)}%
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Fat {Math.round(fatPct)}%
        </li>
      </ul>
    </div>
  )
}
