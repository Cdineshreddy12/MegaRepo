import React from "react"
import Header from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { Footer } from "@/components/layout/Footer"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 container mx-auto p-4">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}
