import { motion } from 'framer-motion'
import { AppWindow } from 'lucide-react'

export function UserApplicationAccess() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
          Application Access
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          View and manage the applications you have access to.
        </p>
      </div>

      <div className="p-8 border-2 border-dashed border-sky-100 rounded-3xl bg-sky-50/30 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-sky-100 flex items-center justify-center mb-4">
          <AppWindow className="w-8 h-8 text-sky-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Coming Soon</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          We're building a new way for you to manage your application assignments directly from here.
        </p>
      </div>
    </motion.div>
  )
}
