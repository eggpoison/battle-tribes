import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point, randInt, StatusEffect, HitboxCollisionType, CircularBox, ItemType } from "battletribes-shared";
import { PlantedComponent } from "../../components/PlantedComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { IceSpikesPlantedComponent, plantedIceSpikesIsFullyGrown } from "../../components/IceSpikesPlantedComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.iceSpikesPlanted, {
   itemType: ItemType.frostcicle,
   getAmount: (entity: Entity) => {
      return plantedIceSpikesIsFullyGrown(entity) ? randInt(1, 2) : 0;
   }
});

export function createIceSpikesPlantedConfig(position: Point, rotation: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 28), 0.3, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const lootComponent = new LootComponent();
   
   const iceSpikesPlantedComponent = new IceSpikesPlantedComponent();
   
   return {
      entityType: EntityType.iceSpikesPlanted,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         plantedComponent,
         lootComponent,
         iceSpikesPlantedComponent
      ],
      lights: []
   };
}