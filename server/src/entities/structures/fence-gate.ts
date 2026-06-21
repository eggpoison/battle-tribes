import { EntityConfig } from "../../components.js";
import Tribe from "../../Tribe.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { FenceGateComponent } from "../../components/FenceGateComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, Hitbox, setHitboxIsNonGrassBlocking, setHitboxIsStatic, setHitboxTag } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType, HitboxTag, setBoxPivotType, PivotPointType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { Point, rotatePoint } from "../../../../shared/dist/utils.js";

export function createFenceGateConfig(x: number, y: number, angle: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   let leftSideHitbox!: Hitbox;
   for (let i = 0; i < 2; i++) {
      const mult = i === 0 ? -1 : 1;
      
      const offset = new Point(32 * mult, 0);
      const offsetRotated = rotatePoint(offset, angle);
      const hitbox = createHitbox(transformComponent, null, createRectangularBox(x + offsetRotated.x, y + offsetRotated.y, offset.x, offset.y, angle, 16, 24), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(hitbox, HitboxTag.fenceGateSide);
      setHitboxIsStatic(hitbox);
      setHitboxIsNonGrassBlocking(hitbox);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (i === 0) {
         leftSideHitbox = hitbox;
      }
   }
   
   const hitbox = createHitbox(transformComponent, leftSideHitbox, createRectangularBox(leftSideHitbox.box.posX, leftSideHitbox.box.posY, 32, 0, 0, 56, 16), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(hitbox, HitboxTag.fenceGateDoor);
   setHitboxIsStatic(hitbox);
   setHitboxIsNonGrassBlocking(hitbox);
   hitbox.box.pivotX = -0.5;
   hitbox.box.pivotY = 0.5;
   setBoxPivotType(hitbox.box, PivotPointType.normalised);
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