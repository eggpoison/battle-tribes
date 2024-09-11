import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { createEmptyStructureConnectionInfo } from "battletribes-shared/structures";
import { createFurnaceHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
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
         // @Copynpaste @Cleanup: don't add here, add in cooking component
         inventories: [
            {
               inventoryName: InventoryName.fuelInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false },
               items: []
            },
            {
               inventoryName: InventoryName.ingredientInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false },
               items: []
            },
            {
               inventoryName: InventoryName.outputInventory,
               width: 1,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false },
               items: []
            }
         ]
      },
      [ServerComponentType.cooking]: {
         remainingHeatSeconds: 0
      }
   };
}