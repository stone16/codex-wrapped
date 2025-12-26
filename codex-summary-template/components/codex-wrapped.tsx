"use client"

import { Calendar, MessageSquare, Zap, FolderOpen, Flame, Clock } from "lucide-react"
import { ActivityHeatmap } from "./activity-heatmap"
import { WeeklyChart } from "./weekly-chart"
import { StatCard } from "./stat-card"

export default function CodexWrapped() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-foreground" fill="currentColor">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Codex</h1>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground text-sm">wrapped</span>
          <span className="text-primary text-2xl md:text-3xl font-bold ml-2">2025</span>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Started</p>
          <p className="text-muted-foreground text-sm">December 1, 2025</p>
          <p className="text-2xl font-bold text-foreground mt-1">24 Days Ago</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Most Active Day</p>
          <p className="text-muted-foreground text-sm">Tuesday</p>
          <p className="text-2xl font-bold text-foreground mt-1">Dec 2</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Weekly Activity</p>
          <WeeklyChart />
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Activity</p>
        <ActivityHeatmap />
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: level === 0 ? "#2a2a2a" : `rgba(16, 163, 127, ${0.25 + level * 0.2})`,
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Calendar} label="Sessions" value="7,413" />
        <StatCard icon={MessageSquare} label="Messages" value="82,427" />
        <StatCard icon={Zap} label="Total Tokens" value="2.2B" />
        <StatCard icon={FolderOpen} label="Projects" value="21" />
        <StatCard icon={Flame} label="Streak" value="24 days" highlight />
        <StatCard icon={Clock} label="Tasks Completed" value="25,164" />
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-muted-foreground text-sm">openai.com/codex</p>
      </div>
    </div>
  )
}
