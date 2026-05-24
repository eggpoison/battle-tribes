import { EntityType, StatusEffect, Point, rotatePoint, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, HitboxCollisionType, HitboxFlag, PivotPointType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import Tribe from "../../Tribe.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { FenceGateComponent } from "../../components/FenceGateComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createFenceGateConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   let leftSideHitbox!: Hitbox;
   for (let i = 0; i < 2; i++) {
      const mult = i === 0 ? -1 : 1;
      
      const offset = new Point(32 * mult, 0);
      const offsetRotated = rotatePoint(offset, angle);
      const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(x + offsetRotated.x, y + offsetRotated.y, offset.x, offset.y, angle, 16, 24), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.FENCE_GATE_SIDE, HitboxFlag.NON_GRASS_BLOCKING]);
      hitbox.isStatic = true;
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (i === 0) {
         leftSideHitbox = hitbox;
      }
   }
   
   const hitbox = new Hitbox(transformComponent, leftSideHitbox, true, new RectangularBox(leftSideHitbox.box.posX, leftSideHitbox.box.posY, 32, 0, 0, 56, 16), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.FENCE_GATE_DOOR, HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.box.pivotX = -0.5;
   hitbox.box.pivotY = 0.5;
   hitbox.box.pivotType = PivotPointType.normalised;
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const fenceGateComponent = new FenceGateComponent();
   
   return {
      entityType: EntityType.fenceGate,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         fenceGateComponent
      ],
      lights: []
   };
}