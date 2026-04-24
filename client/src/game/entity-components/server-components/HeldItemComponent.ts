import { PacketReader, Entity, ServerComponentType, ItemType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.heldItem, _HeldItemComponentArray> {}
}

class _HeldItemComponentArray extends _ServerComponentArray<HeldItemComponent, HeldItemComponentData> {
   public decodeData(reader: PacketReader): HeldItemComponentData {
      const itemType: ItemType = reader.readNumber();
      const hasBlocked = reader.readBool();
      return {
         itemType: itemType,
         hasBlocked: hasBlocked
      };
   }

   public createComponent(entityComponentData: EntityComponentData): HeldItemComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const heldItemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.heldItem);
      
      return {
         hasBlocked: heldItemComponentData.hasBlocked
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: HeldItemComponentData, entity: Entity): void {
      const blockAttackComponent = HeldItemComponentArray.getComponent(entity);
      blockAttackComponent.hasBlocked = data.hasBlocked;
   }
}

export const HeldItemComponentArray = registerServerComponentArray(ServerComponentType.heldItem, _HeldItemComponentArray, true);