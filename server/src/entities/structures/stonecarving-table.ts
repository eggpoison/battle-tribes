import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import { createStonecarvingTableHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.craftingStation;

export function createStonecarvingTableConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.stonecarvingTable,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createStonecarvingTableHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 40
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.craftingStation]: {
         craftingStation: CraftingStation.stonecarvingTable
      }
   };
}