import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig, LightCreationInfo } from "../../components";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { createLight } from "../../lights";

registerEntityLootOnDeath(EntityType.glurbTailSegment, {
   itemType: ItemType.slurb,
   getAmount: () => 1
});

export function createGlurbTailSegmentConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 20), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.GLURB_TAIL_SEGMENT]);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent
      },
      lights: lights
   };
}