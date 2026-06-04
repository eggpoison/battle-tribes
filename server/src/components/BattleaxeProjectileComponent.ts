import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { lerp, angle } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { ThrowingProjectileComponentArray } from "./ThrowingProjectileComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { destroyEntity, entityExists, getEntityAgeTicks } from "../world.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { addHitboxAngularAcceleration, turnHitboxToAngle } from "../hitboxes.js";

const enum Vars {
   RETURN_TIME_TICKS = 1 * Settings.TICK_RATE
}

export class BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ComponentArray<BattleaxeProjectileComponent>(ServerComponentType.battleaxeProjectile, true, getDataLength, addDataToPacket);
BattleaxeProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(battleaxe: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(battleaxe);
   const battleaxeHitbox = transformComponent.hitboxes[0];

   const ageTicks = getEntityAgeTicks(battleaxe);
   if (ageTicks < Vars.RETURN_TIME_TICKS) {
      addHitboxAngularAcceleration(battleaxeHitbox, -6 * Math.PI);
   } else {
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);

      if (!entityExists(throwingProjectileComponent.tribeMember)) {
         destroyEntity(battleaxe);
         return;
      }
      
      if (entitiesAreColliding(battleaxe, throwingProjectileComponent.tribeMember) !== CollisionVars.NO_COLLISION) {
         destroyEntity(battleaxe);
         return;
      }

      
      const ownerTransformComponent = TransformComponentArray.getComponent(throwingProjectileComponent.tribeMember);
      const ownerHitbox = ownerTransformComponent.hitboxes[0];
      
      const ageTicks = getEntityAgeTicks(battleaxe);
      const ticksSinceReturn = ageTicks - Vars.RETURN_TIME_TICKS;
      battleaxeHitbox.box.relativeAngle -= lerp(6 * Math.PI * Settings.DT_S, 0, Math.min(ticksSinceReturn * Settings.DT_S * 1.25, 1));

      // @Hack: Just set velocity instead of adding to position
      const returnDirection = angle(ownerHitbox.box.posX - battleaxeHitbox.box.posX, ownerHitbox.box.posY - battleaxeHitbox.box.posY);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn * Settings.DT_S * 1.5, 1));
      battleaxeHitbox.box.posX += returnSpeed * Settings.DT_S * Math.sin(returnDirection);
      battleaxeHitbox.box.posY += returnSpeed * Settings.DT_S * Math.cos(returnDirection);
      transformComponent.isDirty = true;

      // Turn to face the owner
      turnHitboxToAngle(battleaxeHitbox, returnDirection, ticksSinceReturn * Settings.DT_S * Math.PI, 0.5, false);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}