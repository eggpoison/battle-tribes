import { PacketReader, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";

export interface AttackingEntitiesComponentData {}

export interface AttackingEntitiesComponent {}

export const AttackingEntitiesComponentArray = new ServerComponentArray<AttackingEntitiesComponent, AttackingEntitiesComponentData, never>(ServerComponentType.attackingEntities, true, createComponent, getMaxRenderParts, decodeData);

export function createAttackingEntitiesComponentData(): AttackingEntitiesComponentData {
   return {};
}

function decodeData(reader: PacketReader): AttackingEntitiesComponentData {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
   return {};
}

function createComponent(): AttackingEntitiesComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}