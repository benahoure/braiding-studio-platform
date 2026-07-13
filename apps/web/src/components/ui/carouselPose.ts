// Shared horizon-carousel ring math: the active card faces flat and centered,
// neighbours rotate away into 3D depth (perspective + rotateY + translateZ).

export interface RingPose {
  x: number
  z: number
  rotateY: number
  scale: number
  opacity: number
  zIndex: number
}

export function ringPose(r: number): RingPose {
  switch (r) {
    case 0:
      return { x: 0, z: 40, rotateY: 0, scale: 1, opacity: 1, zIndex: 5 }
    case 1:
      return { x: 175, z: -110, rotateY: -35, scale: 0.86, opacity: 0.7, zIndex: 4 }
    case -1:
      return { x: -175, z: -110, rotateY: 35, scale: 0.86, opacity: 0.7, zIndex: 4 }
    case 2:
      return { x: 310, z: -230, rotateY: -48, scale: 0.72, opacity: 0.3, zIndex: 3 }
    case -2:
      return { x: -310, z: -230, rotateY: 48, scale: 0.72, opacity: 0.3, zIndex: 3 }
    default:
      return {
        x: r > 0 ? 380 : -380,
        z: -320,
        rotateY: r > 0 ? -60 : 60,
        scale: 0.6,
        opacity: 0,
        zIndex: 1,
      }
  }
}

/** Shortest wrap-around distance from `index` to `active` on a ring of `count`. */
export function ringOffset(index: number, active: number, count: number): number {
  let r = index - active
  if (r > count / 2) r -= count
  if (r < -count / 2) r += count
  return r
}
