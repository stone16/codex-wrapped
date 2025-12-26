import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  highlight?: boolean
}

export function StatCard({ icon: Icon, label, value, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-5 border transition-all hover:border-primary/50 ${
        highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  )
}
