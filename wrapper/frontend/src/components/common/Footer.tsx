import { Separator } from '@/components/ui/separator'
import { Typography } from '@/components/common'

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={`w-full border-t bg-background ${className || ''}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:flex-row">
            <Typography variant="muted" className="text-sm">
              © 2024 Wrapper. All rights reserved.
            </Typography>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
            <Typography variant="muted" className="text-sm">
              Built with ❤️ for better business management
            </Typography>
          </div>
          <div className="flex items-center gap-4">
            <Typography variant="muted" className="text-sm">
              Need help? Contact support
            </Typography>
          </div>
        </div>
      </div>
    </footer>
  )
}
