import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ThrowingProjectileComponentArray } from "./ThrowingProjectileComponent";
import { TransformComponentArray } from "./TransformComponent";
import { destroyEntity, entityExists, getEntityAgeTicks } from "../world";

const enum Vars {
   RETURN_TIME_TICKS = 1 * Settings.TPS
}

export interface BattleaxeProjectileComponentParams {}

export class BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ComponentArray<BattleaxeProjectileComponent>(ServerComponentType.battleaxeProjectile, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_battleaxeProjectileComponent: BattleaxeProjectileComponent, battleaxe: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(battleaxe);

   const ageTicks = getEntityAgeTicks(battleaxe);
   if (ageTicks < Vars.RETURN_TIME_TICKS) {
      physicsComponent.angularVelocity = -6 * Math.PI;
   } else {
      physicsComponent.angularVelocity = 0;
      
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);

      if (!entityExists(throwingProjectileComponent.tribeMember)) {
         destroyEntity(battleaxe);
         return;
      }
      
      if (entitiesAreColliding(battleaxe, throwingProjectileComponent.tribeMember) !== CollisionVars.NO_COLLISION) {
         destroyEntity(battleaxe);
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(battleaxe);
      const ownerTransformComponent = TransformComponentArray.getComponent(throwingProjectileComponent.tribeMember);
      
      const ageTicks = getEntityAgeTicks(battleaxe);
      const ticksSinceReturn = ageTicks - Vars.RETURN_TIME_TICKS;
      transformComponent.rotation -= lerp(6 * Math.PI / Settings.TPS, 0, Math.min(ticksSinceReturn / Settings.TPS * 1.25, 1));

      // @Hack: Just set velocity instead of adding to position
      const returnDirection = transformComponent.position.calculateAngleBetween(ownerTransformComponent.position);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn / Settings.TPS * 1.5, 1));
      transformComponent.position.x += returnSpeed * Settings.I_TPS * Math.sin(returnDirection);
      transformComponent.position.y += returnSpeed * Settings.I_TPS * Math.cos(returnDirection);
      physicsComponent.positionIsDirty = true;

      // Turn to face the owner
      physicsComponent.targetRotation = ownerTransformComponent.rotation;
      physicsComponent.turnSpeed = ticksSinceReturn / Settings.TPS * Math.PI;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}