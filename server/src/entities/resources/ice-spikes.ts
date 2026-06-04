import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { IceSpikesComponent } from "../../components/IceSpikesComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

registerEntityLootOnDeath(EntityType.iceSpikes, {
   itemType: ItemType.frostcicle,
   getAmount: () => Math.random() < 0.5 ? 1 : 0
});

export function createIceSpikesConfig(x: number, y: number, angle: number, rootIceSpikes: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 40), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.iceSpikes);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing | StatusEffect.bleeding);
   
   const lootComponent = new LootComponent();
   
   const iceSpikesComponent = new IceSpikesComponent(rootIceSpikes);
   
   return {
      entityType: EntityType.iceSpikes,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         iceSpikesComponent
      ],
      lights: []
   };
}