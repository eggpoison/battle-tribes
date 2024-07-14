import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { PLANT_GROWTH_TICKS, PlantComponentArray } from "../components/PlantComponent";
import { dropBerryOverEntity } from "./resources/berry-bush";
import { createItemsOverEntity } from "../entity-shared";
import { createIceShardExplosion } from "./resources/ice-spikes";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../components";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { TransformComponentArray } from "../components/TransformComponent";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.plant;

export function createPlantConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.plant,
         collisionBit: COLLISION_BITS.plants,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0.3, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 28)]
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding
      },
      [ServerComponentType.plant]: {
         planterBoxID: 0,
         plantType: PlanterBoxPlant.tree
      }
   };
}

export function dropBerryBushCropBerries(plant: EntityID, multiplier: number): void {
   const plantComponent = PlantComponentArray.getComponent(plant);
   if (plantComponent.numFruit === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(plant);
   }

   plantComponent.numFruit--;
}

export function onPlantHit(plant: EntityID): void {
   const plantComponent = PlantComponentArray.getComponent(plant);

   plantComponent.fruitRandomGrowthTicks = 0;

   switch (plantComponent.plantType) {
      case PlanterBoxPlant.berryBush: {
         if (plantComponent.numFruit > 0) {
            dropBerryBushCropBerries(plant, 1);
         }
         break;
      }
   }
}

export function onPlantDeath(plant: EntityID): void {
   const plantComponent = PlantComponentArray.getComponent(plant);

   switch (plantComponent.plantType) {
      case PlanterBoxPlant.tree: {
         // If fully grown, drop wood
         if (plantComponent.plantGrowthTicks === PLANT_GROWTH_TICKS[PlanterBoxPlant.tree]) {
            createItemsOverEntity(plant, ItemType.wood, randInt(2, 4), 40);
            createItemsOverEntity(plant, ItemType.seed, 1, 40);
         }
         break;
      }
      case PlanterBoxPlant.iceSpikes: {
         const transformComponent = TransformComponentArray.getComponent(plant);
         
         const ticksToGrow = PLANT_GROWTH_TICKS[PlanterBoxPlant.iceSpikes];
         if (plantComponent.plantGrowthTicks === ticksToGrow) {
            createItemsOverEntity(plant, ItemType.frostcicle, randInt(1, 2), 40);
            
            createIceShardExplosion(transformComponent.position.x, transformComponent.position.y, randInt(2, 3));
         } else if (plantComponent.plantGrowthTicks >= ticksToGrow * 0.5) {
            createIceShardExplosion(transformComponent.position.x, transformComponent.position.y, randInt(1, 2));
         }
         break;
      }
   }
}