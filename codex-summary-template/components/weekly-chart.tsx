"use client"

export function WeeklyChart() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const values = [35, 45, 100, 60, 50, 40, 25] // Tue is highest

  const maxValue = Math.max(...values)

  return (
    <div className="flex items-end justify-between gap-2 h-16">
      {days.map((day, index) => {
        const height = (values[index] / maxValue) * 100
        const isHighest = values[index] === maxValue

        return (
          <div key={day} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${height}%`,
                backgroundColor: isHighest ? "#10a37f" : "#3a3a3a",
                minHeight: "4px",
              }}
            />
            <span className={`text-[10px] ${isHighest ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
