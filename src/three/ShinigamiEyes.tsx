// Two narrow glowing slits far back in the dark, with a faint red haze.
// No face, no figure — just eyes. Hidden in the hero and rules, they fade in
// with the "Shinigami Eyes" section, blink now and then, and (unless reduced
// motion is on) glance towards the pointer.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, Vector2, type Group, type ShaderMaterial } from 'three'
import { scrollState } from '../lib/scroll'
import { useIsMobile, useReducedMotion } from '../lib/env'
import { aspectFit, damp } from './choreo'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const EYE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uOpen;
  uniform float uSide;
  uniform float uPulse;
  uniform vec2 uLook;
  varying vec2 vUv;
  void main() {
    // Eye space: the almond spans x in [-1, 1].
    vec2 p = (vUv - 0.5) * vec2(2.7, 1.35);
    p.x *= uSide;                       // mirror: +x is always the outer corner
    p.y -= p.x * 0.2 + 0.02;            // outer corners lifted: a narrow, sly slant
    float bow = max(1.0 - p.x * p.x, 0.0);
    float halfH = 0.24 * pow(bow, 0.8) * uOpen + 0.004;
    float cy = -0.05 * bow * uOpen;     // lower lid rounder than the upper
    float d = max(abs(p.y - cy) - halfH, abs(p.x) - 1.0);

    float inside = 1.0 - smoothstep(-0.012, 0.012, d);
    float glow = exp(-max(d, 0.0) * 7.0) * 0.35 + exp(-max(d, 0.0) * 22.0) * 0.55;

    // Iris heat + a thin dark vertical slit that drifts with the gaze.
    vec2 q = p - vec2(uLook.x * 0.28 * uSide, uLook.y * 0.05 + cy);
    float iris = exp(-dot(q * vec2(1.6, 2.6), q * vec2(1.6, 2.6)));
    float slit = smoothstep(0.035, 0.085, abs(q.x) * (1.0 + abs(q.y) * 6.0));

    float core = inside * (0.7 + 0.9 * iris) * mix(0.1, 1.0, slit);
    vec3 col = uColor * (core * uPulse + glow * (0.35 + 0.65 * uOpen));
    // a slightly hotter line right on the lids
    col += vec3(1.0, 0.08, 0.06) * inside * smoothstep(-0.05, 0.0, d) * 0.6;

    float edge = smoothstep(1.35, 1.0, abs(p.x)) * smoothstep(0.67, 0.3, abs(p.y));
    gl_FragColor = vec4(col * edge * uOpacity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const HAZE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.y *= 1.7;
    float d = length(p);
    float g = pow(1.0 - smoothstep(0.0, 1.0, d), 2.0);
    // slow drifting wisps
    float w = 0.75 + 0.25 * sin(p.x * 3.0 + uTime * 0.25 + sin(p.y * 4.0 - uTime * 0.2) * 1.5);
    gl_FragColor = vec4(uColor * g * w * uOpacity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// Placement: far back, high up. On desktop they hang above the open notebook
// (left side) so they peer over it instead of hiding behind the skills panel.
const DESKTOP = { x: -3.9, y: 2.7, z: -8, s: 0.85 }
const MOBILE = { x: 0, y: 3.25, z: -8, s: 0.7 }

const eyeUniforms = (color: Color, side: number) => ({
  uColor: { value: color },
  uOpacity: { value: 0 },
  uOpen: { value: 1 },
  uSide: { value: side },
  uPulse: { value: 1 },
  uLook: { value: new Vector2() },
})

export default function ShinigamiEyes() {
  const group = useRef<Group>(null)
  const left = useRef<ShaderMaterial>(null)
  const right = useRef<ShaderMaterial>(null)
  const haze = useRef<ShaderMaterial>(null)
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))

  const uniforms = useMemo(() => {
    // HDR red, so the bloom pass picks the eyes up (and nothing dimmer).
    const color = new Color('#ff1a26').multiplyScalar(1.5)
    return {
      left: eyeUniforms(color, -1),
      right: eyeUniforms(color, 1),
      haze: { uColor: { value: new Color('#5c0a10') }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    }
  }, [])

  const state = useRef({ fade: 0, nextBlink: 2.5, blinkAt: -10, double: false, lookX: 0, lookY: 0, squint: 0, deal: 0 })
  // The skills section sets data-eyes="open" on itself once the visitor makes the eye deal.
  const section = useRef<HTMLElement | null>(null)

  useFrame((frame, dt) => {
    const g = group.current
    if (!g) return
    const st = state.current
    const t = frame.clock.elapsedTime
    const vis = scrollState.sections.eyes.visibility
    // Fade in only once the eyes section really owns the screen.
    const target = Math.min(1, Math.max(0, (vis - 0.2) / 0.6))
    st.fade = damp(st.fade, target * target * (3 - 2 * target), 2.2, dt)
    g.visible = st.fade > 0.003
    if (!g.visible) return

    section.current ??= document.getElementById('eyes')
    const deal = section.current?.dataset.eyes === 'open' ? 1 : 0
    st.deal = reduced ? deal : damp(st.deal, deal, deal > st.deal ? 4 : 1.5, dt)

    // Blinks: every 2.5–7 s, sometimes a quick double.
    let open = 1
    if (!reduced) {
      if (t > st.nextBlink) {
        st.blinkAt = t
        st.double = Math.random() < 0.25
        st.nextBlink = t + 2.5 + Math.random() * 4.5
      }
      const k = (t - st.blinkAt) / 0.2
      const one = k >= 0 && k <= 1 ? Math.sin(k * Math.PI) : 0
      const k2 = (t - st.blinkAt - 0.32) / 0.18
      const two = st.double && k2 >= 0 && k2 <= 1 ? Math.sin(k2 * Math.PI) : 0
      open = 1 - Math.max(one, two)
      // Narrow suspiciously while the page is scrolled fast.
      st.squint = damp(st.squint, Math.min(Math.abs(scrollState.velocity) * 0.012, 0.45), 4, dt)
      open *= 1 - st.squint
      st.lookX = damp(st.lookX, scrollState.pointer.x, 3, dt)
      st.lookY = damp(st.lookY, scrollState.pointer.y, 3, dt)
    }
    // After the deal the eyes burn brighter and the haze thickens.
    const pulse = (reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 7.1)) * (1 + 0.6 * st.deal)

    for (const m of [left.current, right.current]) {
      if (!m) continue
      m.uniforms.uOpacity.value = st.fade
      m.uniforms.uOpen.value = open
      m.uniforms.uPulse.value = pulse
      const look: Vector2 = m.uniforms.uLook.value
      look.set(st.lookX, st.lookY)
    }
    if (haze.current) {
      haze.current.uniforms.uOpacity.value = st.fade * (0.85 + 0.15 * pulse) * (1 + 0.7 * st.deal)
      haze.current.uniforms.uTime.value = reduced ? 0 : t
    }
  })

  const fit = isMobile ? { x: 1, s: 1 } : aspectFit(aspect)
  const base = isMobile ? MOBILE : DESKTOP
  const p = { ...base, x: base.x * fit.x, s: base.s * fit.s }
  const eyeW = 1.25
  const gap = 0.78

  return (
    <group ref={group} position={[p.x, p.y, p.z]} scale={p.s} visible={false}>
      <mesh position={[0, -0.05, -0.4]} scale={[7, 3.4, 1]}>
        <planeGeometry />
        <shaderMaterial
          ref={haze}
          vertexShader={VERT}
          fragmentShader={HAZE_FRAG}
          uniforms={uniforms.haze}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          fog={false}
        />
      </mesh>
      {(['left', 'right'] as const).map((side) => (
        <mesh
          key={side}
          position={[side === 'left' ? -gap : gap, 0, 0]}
          rotation={[0, 0, side === 'left' ? -0.06 : 0.06]}
          scale={[eyeW, eyeW / 2, 1]}
        >
          <planeGeometry />
          <shaderMaterial
            ref={side === 'left' ? left : right}
            vertexShader={VERT}
            fragmentShader={EYE_FRAG}
            uniforms={uniforms[side]}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}
