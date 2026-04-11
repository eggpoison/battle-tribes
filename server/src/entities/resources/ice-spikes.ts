import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { IceSpikesComponent } from "../../components/IceSpikesComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { Hitbox } from "../../hitboxes";

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