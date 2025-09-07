"use client"

import { useEffect, useState } from "react"

interface GlitchTextProps {
  text: string
  className?: string
}

export function GlitchText({ text, className = "" }: GlitchTextProps) {
  const [glitchText, setGlitchText] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    let glitchInterval: NodeJS.Timeout

    const startGlitch = () => {
      setIsGlitching(true)
      let iterations = 0

      glitchInterval = setInterval(() => {
        setGlitchText(
          text
            .split("")
            .map((char, index) => {
              if (index < iterations) {
                return text[index]
              }
              return glitchChars[Math.floor(Math.random() * glitchChars.length)]
            })
            .join(""),
        )

        if (iterations >= text.length) {
          clearInterval(glitchInterval)
          setGlitchText(text)
          setIsGlitching(false)
        }

        iterations += 1 / 3
      }, 30)
    }

    const randomGlitch = () => {
      if (Math.random() < 0.1) {
        // 10% chance every interval
        startGlitch()
      }
    }

    const mainInterval = setInterval(randomGlitch, 3000)

    return () => {
      clearInterval(mainInterval)
      clearInterval(glitchInterval)
    }
  }, [text])

  return (
    <span
      className={`font-mono ${className} ${isGlitching ? "animate-pulse" : ""}`}
      style={{
        textShadow: isGlitching
          ? "0 0 10px rgba(255, 107, 53, 0.8), 0 0 20px rgba(255, 107, 53, 0.6), 0 0 30px rgba(255, 107, 53, 0.4)"
          : "0 0 10px rgba(255, 107, 53, 0.5)",
      }}
    >
      {glitchText}
    </span>
  )
}



