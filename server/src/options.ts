interface Options {
   readonly spawnEntities: boolean;
   readonly spawnTribesmen: boolean;
   readonly generateRivers: boolean;
   readonly generateWalls: boolean;
   readonly generateCaves: boolean;
   readonly inBenchmarkMode: boolean
   readonly warp: boolean;
}

// @Speed: Make into const enum
const OPTIONS: Options = {
   spawnEntities: true,
   spawnTribesmen: false,
   generateRivers: false,
   generateWalls: true,
   generateCaves: true,
   inBenchmarkMode: false,
   warp: false
}; 

export default OPTIONS;