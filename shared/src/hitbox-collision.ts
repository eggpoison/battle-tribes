export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

export function collisionBitsAreCompatible(collisionMask1: number, collisionBit1: number, collisionMask2: number, collisionBit2: number): boolean {
   return (collisionMask1 & collisionBit2) !== 0 && (collisionMask2 & collisionBit1) !== 0;
}