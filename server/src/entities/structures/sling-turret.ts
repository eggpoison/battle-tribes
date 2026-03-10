import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { TurretComponent } from "../../components/TurretComponent";
import Tribe from "../../Tribe";
import { SlingTurretComponent } from "../../components/SlingTurretComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { Hitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TICK_RATE;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TICK_RATE);

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createSlingTurretConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new CircularBox(position, new Point(0, 0), rotation, 40);
   const hitbox = new Hitbox(transformComponent, null, true, box, 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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