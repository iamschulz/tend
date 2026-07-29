import { describe, it, expect } from 'vitest'
import {
  getStreakStage,
  getStreakIcon,
  streakStageThresholds,
  streakStageCount,
  minStreakLength,
} from '~/util/getStreakStage'

describe('getStreakStage', () => {
  it('has one threshold per growth stage, in ascending order', () => {
    expect(streakStageCount).toBe(8)
    const sorted = [...streakStageThresholds].sort((a, b) => a - b)
    expect([...streakStageThresholds]).toEqual(sorted)
    expect(new Set(streakStageThresholds).size).toBe(streakStageCount)
  })

  it('exposes the shortest length that counts as a streak', () => {
    expect(minStreakLength).toBe(streakStageThresholds[0])
  })

  it('clamps lengths below the first threshold to the first stage', () => {
    expect(getStreakStage(0)).toBe(1)
    expect(getStreakStage(1)).toBe(1)
    expect(getStreakStage(-5)).toBe(1)
    expect(getStreakStage(-Infinity)).toBe(1)
  })

  it('clamps non-numeric input to the first stage', () => {
    expect(getStreakStage(NaN)).toBe(1)
    expect(getStreakStage(undefined as unknown as number)).toBe(1)
  })

  it('starts at the first stage on the shortest streak', () => {
    expect(getStreakStage(minStreakLength)).toBe(1)
  })

  it('advances a stage exactly on each threshold', () => {
    streakStageThresholds.forEach((threshold, i) => {
      expect(getStreakStage(threshold)).toBe(i + 1)
    })
  })

  it('holds the previous stage until the next threshold is reached', () => {
    streakStageThresholds.forEach((threshold, i) => {
      if (i === 0) return
      expect(getStreakStage(threshold - 1)).toBe(i)
    })
  })

  it('caps at the last stage for very long streaks', () => {
    expect(getStreakStage(streakStageThresholds[streakStageCount - 1]!)).toBe(streakStageCount)
    expect(getStreakStage(10_000)).toBe(streakStageCount)
    expect(getStreakStage(Infinity)).toBe(streakStageCount)
  })

  it('stays within the available icons for every input', () => {
    const inputs = [-Infinity, -1, 0, 0.5, 1, 2, 9, 99, 100, 10_000, Infinity, NaN]
    for (const input of inputs) {
      const stage = getStreakStage(input)
      expect(stage, `stage for ${input}`).toBeGreaterThanOrEqual(1)
      expect(stage, `stage for ${input}`).toBeLessThanOrEqual(streakStageCount)
    }
  })

  it('never skips a stage as the length grows', () => {
    let previous = 1
    for (let length = 0; length <= 400; length++) {
      const stage = getStreakStage(length)
      expect(stage - previous).toBeLessThanOrEqual(1)
      expect(stage).toBeGreaterThanOrEqual(previous)
      previous = stage
    }
  })
})

describe('getStreakIcon', () => {
  it('points at the icon for the matching stage', () => {
    expect(getStreakIcon(2)).toBe('/streak-1.svg')
    expect(getStreakIcon(7)).toBe('/streak-3.svg')
    expect(getStreakIcon(365)).toBe(`/streak-${streakStageCount}.svg`)
  })

  it('always resolves to an icon that exists', () => {
    for (const input of [-1, 0, 1, 2, 9, 10_000, NaN]) {
      expect(getStreakIcon(input)).toMatch(/^\/streak-[1-8]\.svg$/)
    }
  })
})
