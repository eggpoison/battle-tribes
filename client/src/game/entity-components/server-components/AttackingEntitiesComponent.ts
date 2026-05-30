import { ServerComponentType } from "../../../../../shared/src/components";
import { Bytes } from "../../../../../shared/src/constants";
import { PacketReader } from "../../../../../shared/src/packets";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AttackingEntitiesComponentData {}

export interface AttackingEntitiesComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.attackingEntities, _AttackingEntitiesComponentArray> {}
}

class _AttackingEntitiesComponentArray extends _ServerComponentArray<AttackingEntitiesComponent, AttackingEntitiesComponentData> {
   public decodeData(reader: PacketReader): AttackingEntitiesComponentData {
      const numAttackingEntities = reader.readNumber();
      reader.padOffset(3 * Bytes.Float32 * numAttackingEntities);
      return {};
   }

   public createComponent(): AttackingEntitiesComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const AttackingEntitiesComponentArray = registerServerComponentArray(ServerComponentType.attackingEntities, _AttackingEntitiesComponentArray, true);

export function createAttackingEntitiesComponentData(): AttackingEntitiesComponentData {
   return {};
}