// The numbered label above every section heading: a short blood rule, then
// "RULE n · SUBTITLE". One pattern for all five sections keeps the rhythm.
import type { CSSProperties } from 'react'
import './RuleEyebrow.css'

type Props = {
  numeral: string
  subtitle: string
  /** Extra classes (spacing, reveal hooks) from the owning section. */
  className?: string
  style?: CSSProperties
}

export default function RuleEyebrow({ numeral, subtitle, className, style }: Props) {
  return (
    <p className={`eyebrow rule-eyebrow${className ? ` ${className}` : ''}`} style={style}>
      <span className="rule-eyebrow__text">
        Rule {numeral} <span aria-hidden="true">·</span> {subtitle}
      </span>
    </p>
  )
}
