import { PlantedComponent } from "../../components/PlantedComponent.js";
import { plantedTreeIsFullyGrown, TreePlantedComponent } from "../../components/TreePlantedComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { randInt } from "../../../../shared/dist/utils.js";

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

export function createTreePlantedConfig(x: number, y: number, angle: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 28), 0.3, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
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