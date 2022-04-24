interface SettingsType {
   /** The number of times that the game ticks every second */
   readonly tps: number;
}

const SETTINGS: SettingsType = {
   tps: 60
};

export default SETTINGS;