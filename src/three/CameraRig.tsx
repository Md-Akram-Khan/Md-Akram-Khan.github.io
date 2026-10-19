// The camera breathes: a gentle sway that follows the pointer and a slight
// dolly per section. Under reduced motion it stays put at [0, 0, 7].
//
// At the very end of the page, as the footer scrolls in, the camera slides down
// by exactly the scrolled distance (measured at the notebook's depth): the scene
// scrolls away with the last section like part of the page, so the opaque footer
// never slices through the notebook or the apple (nearer things, like the apple,
// even rise a touch faster). Contact.css fades the canvas to ink above the footer.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import type { SectionId } from '../data/portfolio'
import { scrollState } from '../lib/scroll'
import { useReducedMotion } from '../lib/env'
import { blendValues, CAMERA, damp, sectionWeights, world } from './choreo'

// Camera z per section: lean in for the rules, step back for the names,
// lean in again at the end, as if about to write.
const DOLLY: Record<SectionId, number> = {
  hero: 7,
  rules: 6.8,
  names: 7.3,
  duels: 7.3,
  cases: 7.3,
  eyes: 6.85,
  contact: 6.65,
}

// Vertical offset of the look target per section (tiny).
const LIFT: Record<SectionId, number> = {
  hero: 0,
  rules: -0.04,
  names: 0.06,
  duels: 0.06,
  cases: 0.06,
  eyes: 0.04,
  contact: 0,
}

const look = new Vector3()

/** How much of the footer's scroll the scene follows (1 = moves with the page). */
const TAIL_FOLLOW = 1

export default function CameraRig() {
  const reduced = useReducedMotion()
  const rig = useRef({ px: 0, py: 0, z: 7, lift: 0 })

  useFrame((frame, dt) => {
    const cam = frame.camera
    // World height of one viewport at the notebook's depth, times how much of
    // the viewport the footer now covers.
    const tanHalf = Math.tan(MathUtils.degToRad(('fov' in cam ? (cam.fov as number) : CAMERA.fov) / 2))
    const tail = (z: number) => scrollState.tail * TAIL_FOLLOW * 2 * tanHalf * Math.max(1, z - world.notebook.z)

    if (reduced) {
      const ty = tail(7)
      cam.position.set(0, -ty, 7)
      cam.lookAt(0, -ty, 0)
      return
    }
    const st = rig.current
    const t = frame.clock.elapsedTime
    const w = sectionWeights()
    st.z = damp(st.z, blendValues(DOLLY, w), 1.6, dt)
    st.lift = damp(st.lift, blendValues(LIFT, w), 1.6, dt)
    st.px = damp(st.px, scrollState.pointer.x, 1.8, dt)
    st.py = damp(st.py, scrollState.pointer.y, 1.8, dt)

    const ty = tail(st.z)
    const driftX = Math.sin(t * 0.17) * 0.05
    const driftY = Math.sin(t * 0.23 + 1) * 0.035
    cam.position.set(st.px * 0.32 + driftX, st.py * 0.2 + driftY - ty, st.z)
    look.set(st.px * 0.06, st.lift + st.py * 0.04 - ty, 0)
    cam.lookAt(look)
  })

  return null
}
