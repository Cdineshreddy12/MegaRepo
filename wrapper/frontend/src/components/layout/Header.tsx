import React from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui.store"
import { Menu, X } from "lucide-react"

export default function Header() {
  const { sidebarOpen, toggleSidebar } = useUIStore()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/" className="text-lg font-semibold">
            Wrapper Business Suite
          </Link>
        </div>
        
        <nav className="hidden md:flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/dashboard/users">Users</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/dashboard/analytics">Analytics</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}
