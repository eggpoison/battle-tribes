import { PacketReader, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface AttackingEntitiesComponentData {}

export interface AttackingEntitiesComponent {}

class _AttackingEntitiesComponentArray extends ServerComponentArray<AttackingEntitiesComponent, AttackingEntitiesComponentData> {
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