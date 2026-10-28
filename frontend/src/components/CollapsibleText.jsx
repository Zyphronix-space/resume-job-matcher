import { useState } from 'react'
import GlassButton from './glass/GlassButton.jsx'

const PREVIEW_CHARS = 900

// Long job descriptions (often thousands of words) are cut to a preview so
// the actions around them stay within reach, especially on a phone.
export default function CollapsibleText({ text }) {
  const [open, setOpen] = useState(false)
  const long = text.length > PREVIEW_CHARS * 1.3
  const shown = !long || open ? text : `${text.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, '')}…`
  return (
    <>
      <div className="posting-description">{shown}</div>
      {long && (
        <GlassButton variant="ghost" size="sm" className="collapsible-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Show less' : 'Show the full description'}
        </GlassButton>
      )}
    </>
  )
}
