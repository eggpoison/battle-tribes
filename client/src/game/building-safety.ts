import { PacketReader } from "webgl-test-shared";

export interface BuildingSafety {
   readonly x: number;
   readonly y: number;
   readonly minSafety: number;
   readonly averageSafety: number;
   readonly extendedAverageSafety: number;
   /** The actual safety */
   readonly safety: number;
}

let buildingSafeties = new Array<BuildingSafety>();

export function resetBuildingSafeties(): void {
   buildingSafeties = new Array<BuildingSafety>();
}

export function getBuildingSafeties(): ReadonlyArray<BuildingSafety> {
   return buildingSafeties;
}

export function readTribeBuildingSafeties(reader: PacketReader): void {
   const numBuildings = reader.readNumber();
   for (let i = 0; i < numBuildings; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const minSafety = reader.readNumber();
      const averageSafety = reader.readNumber();
      const extendedAverageSafety = reader.readNumber();
      const safety = reader.readNumber();

      const buildingSafety: BuildingSafety = {
         x: x,
         y: y,
         minSafety: minSafety,
         averageSafety: averageSafety,
         extendedAverageSafety: extendedAverageSafety,
         safety: safety
      };
      buildingSafeties.push(buildingSafety);
   }
}