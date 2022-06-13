import { BiomeName } from "../terrain-generation";

export type TribeTypes = "humans" | "barbarians" | "frostlings";

type TribeInfo = {
   readonly biome: BiomeName;
   readonly colour: string;
   readonly bloodColour: string;
   readonly description: string;
}

const TRIBE_INFO: Record<TribeTypes, TribeInfo> = {
   humans: {
      biome: "Grasslands",
      colour: "#ffcc17",
      bloodColour: "#ff0000",
      description: "Ordinary creatures with unusually high intelligence."
   },
   barbarians: {
      biome: "Desert",
      colour: "#bf8743",
      bloodColour: "#a30000",
      description: "Frenzied brutes with an appetite for violence."
   },
   frostlings: {
      biome: "Tundra",
      colour: "#b8fbff",
      bloodColour: "#00a38b",
      description: ""
   }
};

export default TRIBE_INFO;