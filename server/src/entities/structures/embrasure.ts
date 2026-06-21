import { EntityConfig } from "../../components.js";
import { destroyEntity, getEntityType } from "../../world.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import Tribe from "../../Tribe.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { BuildingMaterial } from "../../../../shared/dist/components.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

const HEALTHS = [15, 45];

export function createEmbrasureConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   // Add the two vertical hitboxes (can stop arrows)
   const hitbox1 = createHitbox(transformComponent, null, createRectangularBox(x, y, -(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0, angle, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox1);
   addHitboxToTransformComponent(transformComponent, hitbox1);
   const hitbox2 = createHitbox(transformComponent, null, createRectangularBox(x, y, (64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0, angle, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox2);
   addHitboxToTransformComponent(transformComponent, hitbox2);

   // Add the two horizontal hitboxes (cannot stop arrows)
   const hitbox3 = createHitbox(transformComponent, null, createRectangularBox(x, y, -(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0, angle, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.arrowPassable, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox3);
   addHitboxToTransformComponent(transformComponent, hitbox3);
   const hitbox4 = createHitbox(transformComponent, null, createRectangularBox(x, y, (64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0, angle, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.arrowPassable, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox4);
   addHitboxToTransformComponent(transformComponent, hitbox4);

   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   return {
      entityType: EntityType.embrasure,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         buildingMaterialComponent
      ],
      lights: []
   };
}

export function onEmbrasureCollision(collidingEntity: Entity, pushedHitboxIdx: number): void {
   if (getEntityType(collidingEntity) === EntityType.woodenArrow) {
      // @Incomplete?
      // const arrowComponent = ProjectileComponentArray.getComponent(collidingEntity.id);
      // if (arrowComponent.ignoreFriendlyBuildings) {
      //    return;
      // }

      if (pushedHitboxIdx <= 1) {
         destroyEntity(collidingEntity);
      }
   }
}