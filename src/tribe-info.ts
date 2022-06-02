import { BiomeName } from "./terrain-generation";

export type TribeTypes = "humans" | "barbarians" | "frostlings";

type TribeInfo = {
   readonly biome: BiomeName;
   readonly colour: string;
   readonly bloodColour: string;
}

const TRIBE_INFO: Record<TribeTypes, TribeInfo> = {
   humans: {
      biome: "Grasslands",
      colour: "#ffcc17",
      bloodColour: "#ff0000"
   },
   barbarians: {
      biome: "Desert",
      colour: "#bf8743",
      bloodColour: "#a30000"
   },
   frostlings: {
      biome: "Tundra",
      colour: "#b8fbff",
      bloodColour: "#00a38b"
   }
};

export default TRIBE_INFO;