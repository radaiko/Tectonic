import { describe, expect, it } from 'vitest'
import { AnimationPlayback, JointAnimation } from '../../src/motion/JointAnimation'
import { Mate } from '../../src/assembly/Mate'

/** A one-second run of a single joint, enough to drive the transport over. */
function playback(): AnimationPlayback {
  const animation = new JointAnimation({ id: 'a1' })
  animation.addKeyframe('m1', 'angle', { time: 0, value: 0, easing: 'linear' })
  animation.addKeyframe('m1', 'angle', { time: 1, value: 90, easing: 'linear' })
  return new AnimationPlayback(animation)
}

describe('AnimationPlayback rate', () => {
  it('runs at real time until told otherwise', () => {
    expect(playback().speed).toBe(1)
  })

  it('takes a new rate', () => {
    const transport = playback()
    transport.setSpeed(2)
    transport.play()

    expect(transport.speed).toBe(2)
    // Twice the rate covers twice the ground in the same wall-clock slice.
    expect(transport.advance(0.25)).toBeCloseTo(0.5, 9)
  })

  /**
   * A rate of zero would pin the playhead while the transport reported itself
   * playing — a stall with no way out of it from the panel.
   */
  it('refuses a rate that would stall the playhead', () => {
    const transport = playback()
    transport.setSpeed(2)

    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      transport.setSpeed(bad)
      expect(transport.speed).toBe(2)
    }
  })

  it('refuses the same rates when built with them', () => {
    const animation = new JointAnimation({ id: 'a1' })
    expect(new AnimationPlayback(animation, { speed: 0 }).speed).toBe(1)
    expect(new AnimationPlayback(animation, { speed: 3 }).speed).toBe(3)
  })
})

describe('AnimationPlayback looping', () => {
  it('takes its looping from the animation unless told otherwise', () => {
    const looping = new JointAnimation({ id: 'a1', loop: true })

    expect(new AnimationPlayback(looping).loop).toBe(true)
    expect(new AnimationPlayback(looping, { loop: false }).loop).toBe(false)
  })

  it('wraps round the end once looping is turned on', () => {
    const transport = playback()
    transport.setLoop(true)
    transport.play()

    expect(transport.advance(1.5)).toBeCloseTo(0.5, 9)
    expect(transport.playing).toBe(true)
  })

  it('stops at the end when looping is off', () => {
    const transport = playback()
    transport.setLoop(false)
    transport.play()

    expect(transport.advance(1.5)).toBe(1)
    expect(transport.playing).toBe(false)
  })
})

describe('Mate locking', () => {
  const mate = (): Mate =>
    new Mate({ type: 'coincident', componentId1: 'c1', componentId2: 'c2' })

  it('is unlocked until locked', () => {
    const joint = mate()
    expect(joint.isLocked).toBe(false)

    joint.setLocked(true)
    expect(joint.isLocked).toBe(true)

    joint.setLocked(false)
    expect(joint.isLocked).toBe(false)
  })

  it('carries whether it is locked through a round trip', () => {
    const joint = mate()
    joint.setLocked(true)

    expect(Mate.fromJSON(JSON.parse(JSON.stringify(joint.toJSON()))).isLocked).toBe(true)
  })
})
