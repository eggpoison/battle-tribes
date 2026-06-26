import { ServerComponentType } from "../../../../../shared/src/components";
import { Bytes } from "../../../../../shared/src/constants";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AttackingEntitiesComponentData {}

export interface AttackingEntitiesComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.attackingEntities, typeof AttackingEntitiesComponentArray> {}
}

export const AttackingEntitiesComponentArray = registerServerComponentArray(
   ServerComponentType.attackingEntities,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(reader: PacketReader): AttackingEntitiesComponentData {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(3 * Bytes.Float32 * numAttackingEntities);
   return {};
}

function createComponent(): AttackingEntitiesComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

export function createAttackingEntitiesComponentData(): AttackingEntitiesComponentData {
   return {};
}