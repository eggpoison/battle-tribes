interface SettingsType {
   /** The number of times that the game ticks every second */
   readonly tps: number;
   /** The colour of the background visible near the borders */
   readonly backgroundColour: string;
   /** The number of fruit that spawns each second per chunk of spawnable tiles */
   readonly fruitSpawnRate: number;
   /** The game's starting time, in in-game hours */
   readonly startTime: number;
   /** The number of seconds it takes for fog of war to be revealed after the player steps on it */
   readonly fogRevealTime: number;
}

const SETTINGS: SettingsType = {
   tps: 60,
   backgroundColour: "#09120b",
   fruitSpawnRate: 2,
   startTime: 0,
   fogRevealTime: 1
};

export default SETTINGS;