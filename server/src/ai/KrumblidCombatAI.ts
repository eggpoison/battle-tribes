import { assertBoxIsCircular } from "../../../shared/src/boxes/boxes";
import { Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { getAbsAngleDiff, Point } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox } from "../ai-shared";
import { entitiesAreColliding, CollisionVars } from "../collision-detection";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { damageEntity } from "../components/HealthComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { turnHitboxToAngle } from "../hitboxes";
import { getEntityType, getEntityAgeTicks } from "../world";

export class KrumblidCombatAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;
   public readonly turnDamping: number;

   constructor(acceleration: number, turnSpeed: number, turnDamping: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.turnDamping = turnDamping;
   }
}

const dustfleaIsThreat = (krumblid: Entity, dustflea: Entity): boolean => {
   const krumblidTransformComponent = TransformComponentArray.getComponent(krumblid);
   const krumblidHitbox = krumblidTransformComponent.hitboxes[0];

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];

   // Make sure not too far away
   if (getDistanceFromPointToHitbox(krumblidHitbox.box.position, dustfleaHitbox) > 120) {
      return false;
   }
   
   // Make sure the dustflea is looking towards the krumblid
   const angleFromEscapeTarget = dustfleaHitbox.box.position.angleTo(krumblidHitbox.box.position);
   return getAbsAngleDiff(angleFromEscapeTarget, dustfleaHitbox.box.angle) < 0.6;
}

const wantsToAttackEntity = (entity: Entity): boolean => {
   return getEntityType(entity) === EntityType.dustflea;
}

// @Cleanup: shouldn't be extorted to everywhere!!
export function getKrumblidDustfleaThreatTarget(krumblid: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.hitboxes[0];

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.dustflea || !dustfleaIsThreat(krumblid, entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];
      assertBoxIsCircular(entityHitbox.box);

      const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

// @Cleanup: shouldn't be extorted to everywhere!!
export function getKrumblidAttackTarget(krumblid: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.hitboxes[0];

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!wantsToAttackEntity(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];
      assertBoxIsCircular(entityHitbox.box);

      const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export function runKrumblidCombatAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, krumblidCombatAI: KrumblidCombatAI, target: Entity): void {
   aiHelperComponent.currentAIType = AIType.krumblidCombat;
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.hitboxes[0];
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];
   
   // @Incomplete: move using pathfinding!!!
   aiHelperComponent.moveFunc(krumblid, targetHitbox.box.position, krumblidCombatAI.acceleration);
   aiHelperComponent.turnFunc(krumblid, targetHitbox.box.position, krumblidCombatAI.turnSpeed, krumblidCombatAI.turnDamping);

   if (entitiesAreColliding(krumblid, target) !== CollisionVars.NO_COLLISION) {
      // @Copynpaste
      for (let i = 0; i < 2; i++) {
         // @Hack
         const mandibleHitbox = transformComponent.hitboxes[i + 1];
         const idealAngle = ((getEntityAgeTicks(krumblid) * 3.2 + (i === 0 ? Settings.TICK_RATE * 0.35 : 0)) % Settings.TICK_RATE) * Settings.DT_S < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
         turnHitboxToAngle(mandibleHitbox, idealAngle, 12 * Math.PI, 0.5, true);
      }

      if (getEntityAgeTicks(krumblid) % Settings.TICK_RATE === 0) {
         const hitPosition = new Point((targetHitbox.box.position.x + hitbox.box.position.x) / 2, (targetHitbox.box.position.y + hitbox.box.position.y) / 2);
         damageEntity(targetHitbox, krumblid, 1, 0, AttackEffectiveness.effective, hitPosition, 0);
      }
   }
}