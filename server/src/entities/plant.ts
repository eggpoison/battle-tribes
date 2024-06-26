import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { HealthComponent, HealthComponentArray } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import { PLANT_GROWTH_TICKS, PlantComponent, PlantComponentArray } from "../components/PlantComponent";
import { dropBerryOverEntity } from "./resources/berry-bush";
import { createItemsOverEntity } from "../entity-shared";
import { createIceShardExplosion } from "./resources/ice-spikes";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";

const PLANT_HEALTHS: Record<PlanterBoxPlant, number> = {
   [PlanterBoxPlant.tree]: 10,
   [PlanterBoxPlant.berryBush]: 10,
   [PlanterBoxPlant.iceSpikes]: 5,
};

export function createPlant(position: Point, rotation: number, planterBoxID: number, plantType: PlanterBoxPlant): Entity {
   const plantEntity = new Entity(position, rotation, EntityType.plant, COLLISION_BITS.plants, DEFAULT_COLLISION_MASK);

   plantEntity.addHitbox(new CircularHitbox(0.3, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 28))

   HealthComponentArray.addComponent(plantEntity.id, new HealthComponent(PLANT_HEALTHS[plantType]));
   StatusEffectComponentArray.addComponent(plantEntity.id, new StatusEffectComponent(0));
   PlantComponentArray.addComponent(plantEntity.id, new PlantComponent(planterBoxID, plantType));

   return plantEntity;
}

export function dropBerryBushCropBerries(plant: Entity, multiplier: number): void {
   const plantComponent = PlantComponentArray.getComponent(plant.id);
   if (plantComponent.numFruit === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(plant);
   }

   plantComponent.numFruit--;
}

export function onPlantHit(plant: Entity): void {
   const plantComponent = PlantComponentArray.getComponent(plant.id);

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

export function onPlantDeath(plant: Entity): void {
   const plantComponent = PlantComponentArray.getComponent(plant.id);

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
         const ticksToGrow = PLANT_GROWTH_TICKS[PlanterBoxPlant.iceSpikes];
         if (plantComponent.plantGrowthTicks === ticksToGrow) {
            createItemsOverEntity(plant, ItemType.frostcicle, randInt(1, 2), 40);
            
            createIceShardExplosion(plant.position.x, plant.position.y, randInt(2, 3));
         } else if (plantComponent.plantGrowthTicks >= ticksToGrow * 0.5) {
            createIceShardExplosion(plant.position.x, plant.position.y, randInt(1, 2));
         }
         break;
      }
   }
}