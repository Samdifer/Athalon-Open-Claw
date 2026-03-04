import * as React from "react"

import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getMroTermDefinition, isMroTerm } from "@/lib/mro-dictionary"

type SpellCheckTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  showMroTooltips?: boolean
}

const WORD_PATTERN = /[A-Za-z0-9/&-]+(?:\s+[A-Za-z0-9/&-]+)?/g

const SpellCheckTextarea = React.forwardRef<
  HTMLTextAreaElement,
  SpellCheckTextareaProps
>(({ className, showMroTooltips = false, onChange, value, defaultValue, ...props }, ref) => {
  const [detectedTerm, setDetectedTerm] = React.useState<string | undefined>()

  const updateDetectedTerm = React.useCallback((text: string) => {
    const words = text.match(WORD_PATTERN) ?? []
    const found = words.find((candidate) => isMroTerm(candidate.trim()))
    setDetectedTerm(found ? found.trim() : undefined)
  }, [])

  React.useEffect(() => {
    if (typeof value === "string") {
      updateDetectedTerm(value)
    }
  }, [updateDetectedTerm, value])

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateDetectedTerm(event.target.value)
      onChange?.(event)
    },
    [onChange, updateDetectedTerm]
  )

  const definition = detectedTerm
    ? getMroTermDefinition(detectedTerm)
    : undefined

  return (
    <div className="relative" data-mro-spellcheck="true">
      <Textarea
        ref={ref}
        className={cn("mro-term", className)}
        defaultValue={defaultValue}
        onChange={handleChange}
        spellCheck={true}
        title={showMroTooltips && definition ? `${detectedTerm}: ${definition}` : props.title}
        value={value}
        {...props}
      />

      {showMroTooltips && definition && (
        <div
          aria-live="polite"
          className="mro-tooltip pointer-events-none absolute right-2 top-2 hidden max-w-72 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md sm:block"
          role="status"
        >
          <span className="font-semibold">{detectedTerm}</span>: {definition}
        </div>
      )}

    </div>
  )
})

SpellCheckTextarea.displayName = "SpellCheckTextarea"

export { SpellCheckTextarea }
