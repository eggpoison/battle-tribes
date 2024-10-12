/*
Support starts at 0 with a max of 100
*/

const enum Vars {
   MAX_SUPPORT = 100
}

const supportWeights: Partial<Record<number, number>> = {};

export function addMinedSubtileToSupportNetwork(subtileIndex: number): void {
   supportWeights[subtileIndex] = 0;
}