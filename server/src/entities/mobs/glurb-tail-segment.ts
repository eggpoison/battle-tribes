import { HitboxCollisionType, DEFAULT_COLLISION_MASK, CollisionBit, EntityType, ItemType, StatusEffect, Point, createCircularBox, HitboxTag } from "battletribes-shared";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxTag } from "../../hitboxes.js";
import { createLight } from "../../lights.js";

registerEntityLootOnDeath(EntityType.glurbTailSegment, {
   itemType: ItemType.slurb,
   getAmount: () => 1
});

export function createGlurbTailSegmentConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 20), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(hitbox, HitboxTag.glurbTailSegment);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const lootComponent = new LootComponent();
   
   const glurbSegmentComponent = new GlurbSegmentComponent();

   const light = createLight(new Point(0, 0), 0.3, 0.8, 4, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbTailSegment,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         glurbSegmentComponent
      ],
      lights: lights
   };
}