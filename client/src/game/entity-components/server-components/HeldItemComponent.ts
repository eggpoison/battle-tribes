import { PacketReader, Entity, ServerComponentType, ItemType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../networking/packet-snapshots";

export interface HeldItemComponentData {
   readonly itemType: ItemType;
   readonly hasBlocked: boolean;
}

export interface HeldItemComponent {
   hasBlocked: boolean;
}

export const HeldItemComponentArray = new ServerComponentArray<HeldItemComponent, HeldItemComponentData, never>(ServerComponentType.heldItem, true, createComponent, getMaxRenderParts, decodeData);
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