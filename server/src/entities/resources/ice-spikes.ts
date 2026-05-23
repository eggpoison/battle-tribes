import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, StatusEffect, Point, CircularBox, HitboxCollisionType, ItemType } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { IceSpikesComponent } from "../../components/IceSpikesComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.iceSpikes, {
   itemType: ItemType.frostcicle,
   getAmount: () => Math.random() < 0.5 ? 1 : 0
});

export function createIceSpikesConfig(position: Point, rotation: number, rootIceSpikes: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 40), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.iceSpikes, []);
   hitbox.isStatic = true;
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