interface Options {
   readonly spawnEntities: boolean;
   readonly spawnTribes: boolean;
   readonly generateRivers: boolean;
   readonly generateWalls: boolean;
   readonly inBenchmarkMode: boolean
   readonly warp: boolean;
}

// @Speed: Make into const enum
const OPTIONS: Options = {
   spawnEntities: true,
   spawnTribes: true,
   generateRivers: false,
   generateWalls: true,
   inBenchmarkMode: true,
   warp: true
};

export default OPTIONS;