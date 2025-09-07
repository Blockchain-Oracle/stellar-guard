"use client"

import { Button } from "@/components/ui/button"
import type React from "react"

interface CyberButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "danger" | "success"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  type?: "button" | "submit" | "reset"
}

export function CyberButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "default",
  className = "",
  type = "button",
}: CyberButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-[0_0_20px_rgba(255,107,53,0.4)] hover:shadow-[0_0_30px_rgba(255,107,53,0.6)]",
    secondary:
      "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 shadow-[0_0_20px_rgba(107,114,128,0.4)]",
    danger:
      "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    success:
      "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]",
  }

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={`
        ${variants[variant]}
        border border-current/30 
        font-semibold 
        tracking-wide 
        text-white 
        transition-all 
        duration-300 
        transform 
        hover:scale-105 
        active:scale-95
        disabled:opacity-50 
        disabled:cursor-not-allowed
        rounded-lg
        cyber-button
        ${className}
      `}
      style={{
        textShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
      }}
    >
      {children}
    </Button>
  )
}



