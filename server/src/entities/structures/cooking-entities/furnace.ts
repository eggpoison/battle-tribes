import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createFurnaceHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.inventory
   | ServerComponentType.cooking;

export function createFurnaceConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.furnace,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createFurnaceHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 25
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned | StatusEffect.bleeding
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.inventory]: {
         inventories: [
            {
               inventoryName: InventoryName.fuelInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
               items: []
            },
            {
               inventoryName: InventoryName.ingredientInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
               items: []
            },
            {
               inventoryName: InventoryName.outputInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
               items: []
            }
         ]
      },
      [ServerComponentType.cooking]: {
         remainingHeatSeconds: 0
      }
   };
}