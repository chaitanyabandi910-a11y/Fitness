interface MacroProgressProps {
  label: string
  consumed: number
  goal: number | null
  unit: string
  colorClassName: string
}

export function MacroProgress({ label, consumed, goal, unit, colorClassName }: MacroProgressProps) {
  const pct = goal ? Math.min(100, Math.round((consumed / goal) * 100)) : 0

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {Math.round(consumed)}
          {unit} {goal ? `/ ${Math.round(goal)}${unit}` : ''}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${colorClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
