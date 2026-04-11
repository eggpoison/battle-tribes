import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { StatusEffect } from "battletribes-shared/status-effects";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { PlantedComponent } from "../../components/PlantedComponent";
import { plantedTreeIsFullyGrown, TreePlantedComponent } from "../../components/TreePlantedComponent";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { Hitbox } from "../../hitboxes";

registerEntityLootOnDeath(EntityType.treePlanted, {
   itemType: ItemType.wood,
   getAmount: (entity: Entity) => {
      return plantedTreeIsFullyGrown(entity) ? randInt(2, 4) : 0;
   }
});
registerEntityLootOnDeath(EntityType.treePlanted, {
   itemType: ItemType.seed,
   getAmount: (entity: Entity) => {
      return plantedTreeIsFullyGrown(entity) ? 1 : 0;
   }
});

export function createTreePlantedConfig(position: Point, rotation: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 28), 0.3, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const lootComponent = new LootComponent();
   
   const treePlantedComponent = new TreePlantedComponent();
   
   return {
      entityType: EntityType.treePlanted,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         plantedComponent,
         lootComponent,
         treePlantedComponent
      ],
      lights: []
   };
}