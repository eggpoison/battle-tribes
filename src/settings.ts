interface SettingsType {
   /** The number of times that the game ticks every second */
   readonly tps: number;
   /** The colour of the background visible near the borders */
   readonly backgroundColour: string;
   /** The number of fruit that spawns each second per chunk of spawnable tiles */
   readonly fruitSpawnRate: number;
}

const SETTINGS: SettingsType = {
   tps: 60,
   backgroundColour: "#09120b",
   fruitSpawnRate: 2
};

export default SETTINGS;