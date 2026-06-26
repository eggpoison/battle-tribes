import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { ItemType } from "../../../../../shared/src/items/items";
import { PacketReader } from "../../../../../shared/src/packets";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface HeldItemComponentData {
   readonly itemType: ItemType;
   readonly hasBlocked: boolean;
}

export interface HeldItemComponent {
   hasBlocked: boolean;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.heldItem, typeof HeldItemComponentArray> {}
}

export const HeldItemComponentArray = registerServerComponentArray(
   ServerComponentType.heldItem,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
HeldItemComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): HeldItemComponentData {
   const itemType: ItemType = reader.readNumber();
   const hasBlocked = reader.readBool();
   return {
      itemType: itemType,
      hasBlocked: hasBlocked
   };
}

function createComponent(entityComponentData: EntityComponentData): HeldItemComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const heldItemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.heldItem);
   
   return {
      hasBlocked: heldItemComponentData.hasBlocked
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateFromData(data: HeldItemComponentData, entity: Entity): void {
   const blockAttackComponent = HeldItemComponentArray.getComponent(entity);
   blockAttackComponent.hasBlocked = data.hasBlocked;
}