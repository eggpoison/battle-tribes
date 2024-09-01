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
   spawnEntities: false,
   spawnTribes: false,
   generateRivers: true,
   generateWalls: false,
   inBenchmarkMode: false,
   warp: false
};

export default OPTIONS;