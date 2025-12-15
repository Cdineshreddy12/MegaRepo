import { useEffect, useState } from "react"
import { format } from "date-fns"

export const DateTimePill: React.FC = () => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000) // live update every second

    return () => clearInterval(interval)
  }, [])

  const day = format(now, "dd")
  const weekday = format(now, "EEE") // e.g. Tue
  const month = format(now, "MMMM") // e.g. January
  const time = format(now, "hh:mm a") // e.g. 03:25 PM

  return (
    <div className="flex items-center gap-2 bg-background p-4 rounded-full min-w-fit shadow-sm">
      <div className="bg-black text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-2xl">
        {day}
      </div>
      <div className="text-sm leading-tight">
        <div className="font-medium">{weekday}, {month}</div>
        <div className="text-muted-foreground">{time}</div>
      </div>
    </div>
  )
}
