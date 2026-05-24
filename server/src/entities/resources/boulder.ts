import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, StatusEffect, randInt, HitboxCollisionType, CircularBox, ItemType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { BoulderComponent } from "../../components/BoulderComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.boulder, {
   itemType: ItemType.rock,
   getAmount: () => randInt(5, 7)
});

export function createBoulderConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 40), 1.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(40);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const lootComponent = new LootComponent();
   
   const boulderComponent = new BoulderComponent();
   
   return {
      entityType: EntityType.boulder,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         boulderComponent
      ],
      lights: []
   };
}