import { BiomeName } from "./terrain-generation";

export type TribeTypes = "humans" | "barbarians" | "frostlings";

type TribeInfo = {
   readonly biome: BiomeName;
   readonly colour: string;
}

const TRIBE_INFO: Record<TribeTypes, TribeInfo> = {
   humans: {
      biome: "Grasslands",
      colour: "#ffcc17"
   },
   barbarians: {
      biome: "Desert",
      colour: "#bf8743"
   },
   frostlings: {
      biome: "Tundra",
      colour: "#b8fbff"
   }
};

export default TRIBE_INFO;