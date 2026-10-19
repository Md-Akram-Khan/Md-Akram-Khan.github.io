// Post-processing: HDR bloom tuned so only emissive things (eyes, embers,
// apple highlights) glow, then ACES tone mapping, a whisper of chromatic
// aberration at the edges, grain and a heavy vignette.
// Not mounted on phones or once the PerformanceMonitor has given up.
import { useMemo } from 'react'
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Vector2 } from 'three'

type Props = {
  /** 'full' adds more multisampling, more bloom levels and chromatic aberration. */
  quality: 'full' | 'lite'
  /** Reduced motion: no animated film grain (it changes every frame). */
  still?: boolean
}

export default function Effects({ quality, still = false }: Props) {
  const offset = useMemo(() => new Vector2(0.0009, 0.0006), [])
  const full = quality === 'full'

  return (
    <EffectComposer multisampling={full ? 4 : 2} stencilBuffer={false}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.95}
        luminanceSmoothing={0.12}
        intensity={full ? 1.15 : 0.9}
        radius={0.72}
        levels={full ? 7 : 5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {full ? <ChromaticAberration offset={offset} radialModulation modulationOffset={0.4} /> : null}
      {still ? null : <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.22} />}
      <Vignette offset={0.2} darkness={0.78} eskil={false} />
    </EffectComposer>
  )
}
