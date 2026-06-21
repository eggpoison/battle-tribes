import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { EntityConfig } from "../../components.js";
import { AIHelperComponent } from "../../components/AIHelperComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { TurretComponent } from "../../components/TurretComponent.js";
import Tribe from "../../Tribe.js";
import { SlingTurretComponent } from "../../components/SlingTurretComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TICK_RATE;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TICK_RATE);

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createSlingTurretConfig(x: number, y: number, rotation: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = createCircularBox(x, y, 0, 0, rotation, 40);
   const hitbox = createHitbox(transformComponent, null, box, 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS);
   
   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 400, moveFunc, turnFunc);

   const slingTurretComponent = new SlingTurretComponent();
   
   return {
      entityType: EntityType.slingTurret,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         turretComponent,
         aiHelperComponent,
         slingTurretComponent
      ],
      lights: []
   };
}