import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { PLANT_GROWTH_TICKS, PlantComponent, PlantComponentArray } from "../components/PlantComponent";
import { dropBerryOverEntity } from "./resources/berry-bush";
import { createItemsOverEntity } from "../entity-shared";
import { createIceShardExplosion } from "./resources/ice-spikes";
import { ItemType } from "battletribes-shared/items/items";
import { EntityConfig } from "../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityLayer } from "../world";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { CollisionGroup } from "../../../shared/src/collision-groups";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.plant;

const PLANT_HEALTHS: Record<PlanterBoxPlant, number> = {
   [PlanterBoxPlant.tree]: 10,
   [PlanterBoxPlant.berryBush]: 10,
   [PlanterBoxPlant.iceSpikes]: 5,
};

export function createPlantConfig(plantType: PlanterBoxPlant, planterBox: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 28), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;

   const healthComponent = new HealthComponent(PLANT_HEALTHS[plantType]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantComponent = new PlantComponent(plantType, planterBox);
   
   return {
      entityType: EntityType.plant,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.plant]: plantComponent
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
         
         const layer = getEntityLayer(plant);
         const ticksToGrow = PLANT_GROWTH_TICKS[PlanterBoxPlant.iceSpikes];
         if (plantComponent.plantGrowthTicks === ticksToGrow) {
            createItemsOverEntity(plant, ItemType.frostcicle, randInt(1, 2), 40);
            
            createIceShardExplosion(layer, transformComponent.position.x, transformComponent.position.y, randInt(2, 3));
         } else if (plantComponent.plantGrowthTicks >= ticksToGrow * 0.5) {
            createIceShardExplosion(layer, transformComponent.position.x, transformComponent.position.y, randInt(1, 2));
         }
         break;
      }
   }
}