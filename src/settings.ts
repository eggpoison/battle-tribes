import { MapType } from "./terrain-generation";

interface SettingsType {
   /** The number of times that the game ticks every second */
   readonly tps: number;
   /** The colour of the background visible near the borders */
   readonly backgroundColour: string;
   /** The game's starting time, in in-game hours */
   readonly startTime: number;
   /** The number of seconds it takes for fog of war to be revealed after the player steps on it */
   readonly fogRevealTime: number;
   /** How long an entity is invulnerable after being hit, in seconds */
   readonly entityInvulnerabilityDuration: number;
   /** Which type of map to generate */
   readonly mapGenerationType: MapType;
   /** Whether the fog of war is shown */
   readonly showFogOfWar: boolean;
}

const SETTINGS: SettingsType = {
   tps: 60,
   backgroundColour: "#09120b",
   startTime: 0,
   fogRevealTime: 0.5,
   entityInvulnerabilityDuration: 0.15,
   mapGenerationType: "normal",
   showFogOfWar: true
};

export default SETTINGS;