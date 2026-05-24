import { HitboxCollisionType, CircularBox, DEFAULT_COLLISION_MASK, CollisionBit, EntityType, ItemType, StatusEffect, Point } from "battletribes-shared";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { GlurbBodySegmentComponent } from "../../components/GlurbBodySegmentComponent.js";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { createLight } from "../../lights.js";

registerEntityLootOnDeath(EntityType.glurbBodySegment, {
   itemType: ItemType.slurb,
   getAmount: () => 1
});

export function createGlurbBodySegmentConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 28), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const lootComponent = new LootComponent();
   
   const glurbSegmentComponent = new GlurbSegmentComponent();

   const glurbBodySegmentComponent = new GlurbBodySegmentComponent();

   const light = createLight(new Point(0, 0), 0.4, 0.8, 8, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbBodySegment,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         glurbSegmentComponent,
         glurbBodySegmentComponent
      ],
      lights: lights
   };
}