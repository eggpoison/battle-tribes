import { TribeType } from "battletribes-shared/tribes";

interface ClientTribeInfo {
   readonly name: string;
}

const CLIENT_TRIBE_INFO_RECORD: Record<TribeType, ClientTribeInfo> = {
   [TribeType.plainspeople]: {
      name: "Plainspeople"
   },
   [TribeType.barbarians]: {
      name: "Barbarians"
   },
   [TribeType.frostlings]: {
      name: "Frostlings"
   },
   [TribeType.goblins]: {
      name: "Goblins"
   },
   [TribeType.dwarves]: {
      name: "Dwarves"
   }
};

export default CLIENT_TRIBE_INFO_RECORD;