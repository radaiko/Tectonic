import { describe, it } from 'vitest'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { buildRectangle, buildPolygon, buildCircle } from '../../src/sketch/domain/builders'
import { sketchProfiles } from '../../src/features/geometry/profile'

describe('probe', () => {
  it('rectangle', () => {
    const s = new SketchModel({ plane: 'XY' })
    buildRectangle(s, { x: -10, y: -5 }, { x: 10, y: 5 })
    const p = sketchProfiles(s)
    console.log('rect profiles', p.length, JSON.stringify(p.map((x) => ({ n: x.points.length, holes: x.holes?.length ?? 0 }))))
  })
  it('polygon', () => {
    const s = new SketchModel({ plane: 'XY' })
    buildPolygon(s, [{ x: -10, y: -5 }, { x: 10, y: -5 }, { x: 10, y: 5 }, { x: -10, y: 5 }])
    const p = sketchProfiles(s)
    console.log('poly profiles', p.length, JSON.stringify(p.map((x) => ({ n: x.points.length, holes: x.holes?.length ?? 0 }))))
  })
  it('circle', () => {
    const s = new SketchModel({ plane: 'XY' })
    buildCircle(s, { x: 0, y: 0 }, 5)
    const p = sketchProfiles(s)
    console.log('circle profiles', p.length, p[0]?.points.length)
  })
})
