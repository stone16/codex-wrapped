"use client"

export function ActivityHeatmap() {
  // Generate mock data for the year - mostly empty with activity in recent months
  const generateHeatmapData = () => {
    const data: number[][] = []
    const weeks = 52
    const daysPerWeek = 7

    for (let week = 0; week < weeks; week++) {
      const weekData: number[] = []
      for (let day = 0; day < daysPerWeek; day++) {
        // More activity in recent weeks (last ~4 weeks = Dec)
        if (week >= 48) {
          weekData.push(Math.random() > 0.2 ? Math.floor(Math.random() * 4) + 1 : 0)
        } else if (week >= 44) {
          weekData.push(Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0)
        } else {
          weekData.push(0)
        }
      }
      data.push(weekData)
    }
    return data
  }

  const heatmapData = generateHeatmapData()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const getColor = (level: number) => {
    if (level === 0) return "#2a2a2a"
    return `rgba(16, 163, 127, ${0.25 + level * 0.2})`
  }

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-2 text-xs text-muted-foreground">
        {months.map((month, i) => (
          <div key={month} className="flex-1 text-center" style={{ minWidth: `${100 / 12}%` }}>
            {month}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-[2px]">
        {heatmapData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[2px]">
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm transition-colors hover:ring-1 hover:ring-primary/50"
                style={{ backgroundColor: getColor(day) }}
                title={`Week ${weekIndex + 1}, Day ${dayIndex + 1}: ${day} contributions`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
