import { TribeType } from "webgl-test-shared/dist/tribes";

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
   }
};

export default CLIENT_TRIBE_INFO_RECORD;