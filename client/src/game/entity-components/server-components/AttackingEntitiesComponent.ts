import { PacketReader, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AttackingEntitiesComponentData {}

export interface AttackingEntitiesComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.attackingEntities, _AttackingEntitiesComponentArray, AttackingEntitiesComponentData> {}
}

class _AttackingEntitiesComponentArray extends _ServerComponentArray<AttackingEntitiesComponent, AttackingEntitiesComponentData> {
   public decodeData(reader: PacketReader): AttackingEntitiesComponentData {
      const numAttackingEntities = reader.readNumber();
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
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