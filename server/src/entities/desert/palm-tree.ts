import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, ItemType, StatusEffect, Point, randInt } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { PalmTreeComponent } from "../../components/PalmTreeComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.palmTree, {
   itemType: ItemType.wood,
   getAmount: () => randInt(3, 5)
});

export function createPalmTreeConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 58), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(20);

   const lootComponent = new LootComponent();
   
   const palmTreeComponent = new PalmTreeComponent();
   
   return {
      entityType: EntityType.palmTree,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         lootComponent,
         palmTreeComponent
      ],
      lights: []
   };
}