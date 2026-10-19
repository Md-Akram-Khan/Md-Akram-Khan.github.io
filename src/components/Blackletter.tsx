// Blackletter text with a Roman capital where the Fraktur form misreads today:
// Unifraktur's "A" reads as a "U" ("Ukram"), so names set in the gothic face get
// an old-style Roman initial instead, like an initial set in a printed book.
// Screen readers still get the plain text: the spans add no words or pauses.
import { Fragment } from 'react'
import './Blackletter.css'

const ROMAN = new Set(['A'])

export default function Blackletter({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) =>
        ROMAN.has(ch) ? (
          <span key={i} className="blackletter__roman">
            {ch}
          </span>
        ) : (
          <Fragment key={i}>{ch}</Fragment>
        ),
      )}
    </>
  )
}
