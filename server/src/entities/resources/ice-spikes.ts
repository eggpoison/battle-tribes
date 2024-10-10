import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { IceSpikesComponent } from "../../components/IceSpikesComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.iceSpikes;

const ICE_SPIKE_RADIUS = 40;

export function createIceSpikesConfig(rootIceSpikes: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.damagingResource);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, ICE_SPIKE_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.iceSpikes;
   
   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing | StatusEffect.bleeding);
   
   const iceSpikesComponent = new IceSpikesComponent(rootIceSpikes);
   
   return {
      entityType: EntityType.iceSpikes,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.iceSpikes]: iceSpikesComponent
      }
   };
}