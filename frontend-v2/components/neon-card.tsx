"use client"

import { Card } from "@/components/ui/card"
import type React from "react"

interface NeonCardProps {
  children: React.ReactNode
  className?: string
  variant?: "orange" | "red" | "green" | "blue" | "purple" | "cyan"
  onClick?: () => void
}

export function NeonCard({ children, className = "", variant = "orange", onClick }: NeonCardProps) {
  const glowColors = {
    orange: "shadow-[0_0_20px_rgba(255,107,53,0.3)] border-orange-500/30 hover:shadow-[0_0_30px_rgba(255,107,53,0.4)]",
    red: "shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]",
    green: "shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500/30 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]",
    blue: "shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]",
    purple: "shadow-[0_0_20px_rgba(147,51,234,0.3)] border-purple-500/30 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]",
    cyan: "shadow-[0_0_20px_rgba(6,182,212,0.3)] border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]",
  }

  return (
    <Card
      className={`bg-gray-900/60 backdrop-blur-sm border ${glowColors[variant]} transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      {children}
    </Card>
  )
}





