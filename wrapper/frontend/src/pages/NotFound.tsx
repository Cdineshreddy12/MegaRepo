import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Home, ArrowLeft, Search, HelpCircle, Lightbulb } from 'lucide-react'
import { Typography } from '@/components/common'

export default function NotFound() {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-6">
          {/* 404 Header */}
          <div className="space-y-2">
            <Typography variant="h1" className="text-muted-foreground/20 select-none text-8xl font-bold">
              404
            </Typography>
            <Typography variant="h1">
              Page Not Found
            </Typography>
            <Typography variant="muted">
              The page you're looking for doesn't exist or has been moved.
            </Typography>
          </div>

          {/* Main Card */}
          <Card>
            <CardHeader>
              <CardTitle>Let's get you back on track</CardTitle>
              <CardDescription>
                Don't worry, even the best explorers sometimes take a wrong turn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
              </div>
            </CardContent>
          </Card>

          {/* Helpful Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Search</h3>
                    <p className="text-sm text-muted-foreground">Find what you're looking for</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Help Center</h3>
                    <p className="text-sm text-muted-foreground">Get support and guidance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pro Tip */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro tip:</strong> If you keep getting lost, try bookmarking your favorite pages!
            </AlertDescription>
          </Alert>
        </div>
    </div>
  )
}