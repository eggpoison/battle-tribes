import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import Tribe from "../../Tribe";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { FenceGateComponent } from "../../components/FenceGateComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point, rotatePoint } from "../../../../shared/src/utils";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";
import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";

export function createFenceGateConfig(position: Point, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   let leftSideHitbox!: Hitbox;
   for (let i = 0; i < 2; i++) {
      const mult = i === 0 ? -1 : 1;
      
      const hitboxPosition = position.copy();
      hitboxPosition.add(rotatePoint(new Point(32 * mult, 0), angle));
      const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(hitboxPosition, new Point(0, 0), angle, 16, 24), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.FENCE_GATE_SIDE, HitboxFlag.NON_GRASS_BLOCKING]);
      hitbox.isStatic = true;
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (i === 0) {
         leftSideHitbox = hitbox;
      }
   }
   
   const hitbox = new Hitbox(transformComponent, leftSideHitbox, true, new RectangularBox(leftSideHitbox.box.position.copy(), new Point(32, 0), 0, 56, 16), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.FENCE_GATE_DOOR, HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.box.pivot = createNormalisedPivotPoint(-0.5, 0.5);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const fenceGateComponent = new FenceGateComponent();
   
   return {
      entityType: EntityType.fenceGate,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fenceGate]: fenceGateComponent
      },
      lights: []
   };
}