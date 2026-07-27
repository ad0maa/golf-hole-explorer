import { mulberry32 } from '../lib/prng'

export type HoleDefinition = {
  number: number
  par: number
  name: string
  lengthM: number
  /** Hole centreline in world XZ, tee first, pin last. Y is the design height of the fairway. */
  centreline: [number, number, number][]
  /** Metres, FULL width. */
  fairwayWidth: number
  greenRadius: number
  /** XZ polygons. */
  bunkers: { polygon: [number, number][]; depth: number }[]
  water: { polygon: [number, number][] }[]
  /** World Y of the water plane for this hole. */
  waterLevel: number
  /** How far back from centreline[0] the tee sits. */
  teeOffsetM: number
  /** 0..1 noise amplitude multiplier for the rough. */
  roughness: number
  seed: number
}

/**
 * Bellarine Links. World units are metres, Y is up, and each hole runs roughly along -Z
 * from a tee near the origin.
 *
 * Looking down -Z with Y up, the right-hand side is +X: forward x up = (0,0,-1) x (0,1,0)
 * = (1,0,0). So a dogleg right curves toward +X.
 */
export const HOLES: HoleDefinition[] = [
  {
    number: 1,
    par: 4,
    name: 'The Point',
    lengthM: 365,
    // Gentle dogleg right, climbing to a raised green.
    centreline: [
      [0, 0, 0],
      [0, 0.5, -90],
      [6, 1.2, -175],
      [24, 2.4, -250],
      [38, 4.0, -320],
      [44, 5.5, -365],
    ],
    fairwayWidth: 34,
    greenRadius: 14,
    // Two fairway bunkers on the inside (+X side) of the dogleg.
    bunkers: [
      {
        polygon: [
          [26, -232],
          [38, -236],
          [41, -250],
          [33, -258],
          [25, -248],
        ],
        depth: 1.6,
      },
      {
        polygon: [
          [30, -268],
          [41, -272],
          [44, -286],
          [35, -291],
          [29, -281],
        ],
        depth: 1.4,
      },
    ],
    water: [],
    waterLevel: -50,
    teeOffsetM: 8,
    roughness: 0.6,
    seed: 1337,
  },
  {
    number: 2,
    par: 3,
    name: 'Bass Strait',
    lengthM: 165,
    centreline: [
      [0, 3.0, 0],
      [0, 2.0, -55],
      [-4, 1.6, -110],
      [-6, 3.5, -165],
    ],
    fairwayWidth: 26,
    greenRadius: 13,
    // Three pot bunkers ringing the green.
    bunkers: [
      {
        polygon: [
          [-23, -158],
          [-14, -160],
          [-13, -168],
          [-19, -171],
          [-24, -165],
        ],
        depth: 1.8,
      },
      {
        polygon: [
          [0, -156],
          [8, -158],
          [10, -166],
          [4, -169],
          [-1, -162],
        ],
        depth: 1.8,
      },
      {
        polygon: [
          [-13, -180],
          [-2, -182],
          [0, -190],
          [-8, -192],
          [-14, -186],
        ],
        depth: 1.8,
      },
    ],
    // All carry: one wide inlet between tee and green. Deliberately irregular — a
    // rectangle reads as a swimming pool from above.
    water: [
      {
        polygon: [
          [-70, -34],
          [-44, -29],
          [-16, -33],
          [12, -27],
          [40, -32],
          [70, -26],
          [70, -120],
          [46, -128],
          [18, -121],
          [-10, -130],
          [-38, -122],
          [-70, -129],
        ],
      },
    ],
    waterLevel: 0.4,
    teeOffsetM: 5,
    roughness: 0.5,
    seed: 2718,
  },
  {
    number: 3,
    par: 5,
    name: 'The Spit',
    lengthM: 480,
    // Long and uphill: climbs 21m from tee to green. Wide fairway.
    centreline: [
      [0, 0, 0],
      [-8, 2, -100],
      [-4, 6, -200],
      [6, 11, -300],
      [2, 16, -400],
      [-4, 21, -480],
    ],
    fairwayWidth: 44,
    greenRadius: 15,
    // Bunker cluster at the 250m mark.
    bunkers: [
      {
        polygon: [
          [10, -238],
          [20, -242],
          [22, -254],
          [12, -258],
          [7, -247],
        ],
        depth: 1.7,
      },
      {
        polygon: [
          [-24, -244],
          [-14, -247],
          [-12, -259],
          [-22, -263],
          [-27, -253],
        ],
        depth: 1.7,
      },
      {
        polygon: [
          [-6, -262],
          [4, -265],
          [6, -276],
          [-4, -279],
          [-9, -270],
        ],
        depth: 1.5,
      },
    ],
    water: [],
    waterLevel: -50,
    teeOffsetM: 10,
    roughness: 0.7,
    seed: 3141,
  },
]

/** The pin is the LAST centreline point. `pinY` throughout the codebase means `pinOf(h)[1]`. */
export const pinOf = (h: HoleDefinition): [number, number, number] =>
  h.centreline[h.centreline.length - 1]

/** The tee sits `teeOffsetM` back along the line from centreline[0] toward centreline[1]. */
export function teeOf(h: HoleDefinition): [number, number, number] {
  const a = h.centreline[0]
  const b = h.centreline[1]
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const len = Math.hypot(dx, dz) || 1
  return [a[0] - (dx / len) * h.teeOffsetM, a[1], a[2] - (dz / len) * h.teeOffsetM]
}

/** Wind is randomised per hole from the hole's seed: direction in radians, speed 2-8 m/s. */
export function windForHole(h: HoleDefinition): { dir: number; speed: number } {
  const rng = mulberry32(h.seed ^ 0x5f3759df)
  return { dir: rng() * Math.PI * 2, speed: 2 + rng() * 6 }
}
