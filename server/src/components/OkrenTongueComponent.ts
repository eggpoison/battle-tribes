import { HitboxCollisionType, HitboxFlag } from "../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { assert, customTickIntervalHasPassed, Point, polarVec2, randInt } from "../../../shared/src/utils";
import { MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS } from "../ai/OkrenCombatAI";
import { addHitboxVelocity, applyAcceleration, getHitboxTotalMassIncludingChildren, Hitbox, HitboxAngularTether, turnHitboxToAngle } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyTether, tetherHitboxes } from "../tethers";
import { entityExists, getEntityAgeTicks, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { addHitboxToEntity, TransformComponent, TransformComponentArray } from "./TransformComponent";

export class OkrenTongueComponent {
   public target: Entity;
   
   public isRetracting = false;
   public hasCaughtSomething = false;
   public caughtEntity = 0;

   constructor(target: Entity) {
      this.target = target;
   }
}

export const OkrenTongueComponentArray = new ComponentArray<OkrenTongueComponent>(ServerComponentType.okrenTongue, true, getDataLength, addDataToPacket);
OkrenTongueComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenTongueComponentArray.onHitboxCollision = onHitboxCollision;
OkrenTongueComponentArray.onTakeDamage = onTakeDamage;

// @HACK @COPYNPASTE
const TONGUE_INITIAL_OFFSET = 88;
const IDEAL_SEPARATION = 18;
const MAX_TONGUE_LENGTH = 500;

const getTongueBaseHitbox = (tongueTransformComponent: TransformComponent): Hitbox => {
   return tongueTransformComponent.hitboxes[tongueTransformComponent.hitboxes.length - 1];
}

const getTongueTipHitbox = (tongueTransformComponent: TransformComponent): Hitbox => {
   return tongueTransformComponent.hitboxes[0];
}

const getTongueLength = (tongueTransformComponent: TransformComponent): number => {
   return IDEAL_SEPARATION * tongueTransformComponent.hitboxes.length;
}

// @COPYNPASTE
const getTonguePosition = (originHitbox: Hitbox, offsetMagnitude: number): Point => {
   const offsetDirection = originHitbox.box.angle;
   const x = originHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = originHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

const getOkren = (tongueTransformComponent: TransformComponent): Entity => {
   const tongueTipHitbox = getTongueTipHitbox(tongueTransformComponent);
   return tongueTipHitbox.parent!.entity;
}

const addTongueSegment = (tongue: Entity, okrenHitbox: Hitbox, previousBaseHitbox: Hitbox, distance: number): void => {
   const transformComponent = TransformComponentArray.getComponent(tongue);
   
   // Create the new base segment hitbox
   const offsetMagnitude = distance - IDEAL_SEPARATION;
   const newSegmentHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(getTonguePosition(okrenHitbox, offsetMagnitude), new Point(0, 0), okrenHitbox.box.angle, 16, 24), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_TONGUE_SEGMENT_MIDDLE]);
   addHitboxToEntity(tongue, newSegmentHitbox)

   // Remove the old base entities' tether to the okren
   let didFind = false;
   for (let i = 0; i < previousBaseHitbox.angularTethers.length; i++) {
      const angularTether = previousBaseHitbox.angularTethers[i];
      if (angularTether.originHitbox === okrenHitbox) {
         previousBaseHitbox.angularTethers.splice(i, 1);
         didFind = true;
         break;
      }
   }
   if (!didFind) {
      throw new Error();
   }
   
   // Restrict the new base entity to match the direction of the okren
   // (Make sure the root of the tongue begins at the okren's mouth)
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 2.5/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   };
   newSegmentHitbox.angularTethers.push(angularTether);

   // Tether the old base entity to the new base entity
   tetherHitboxes(previousBaseHitbox, newSegmentHitbox, IDEAL_SEPARATION, 280, 2.5);
   previousBaseHitbox.angularTethers.push({
      originHitbox: newSegmentHitbox,
      idealAngle: 0,
      springConstant: 1,
      damping: 0.1,
      padding: 0.03,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   });
   
   // Apply some initial velocity
   addHitboxVelocity(newSegmentHitbox, polarVec2(200, okrenHitbox.box.angle));
}

const advanceTongue = (tongue: Entity, tongueTransformComponent: TransformComponent, okrenTongueComponent: OkrenTongueComponent, okren: Entity): void => {
   const target = okrenTongueComponent.target;
   if (!entityExists(target)) {
      return;
   }

   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   // Move all the segments to the target, but move the tip more
   for (let i = 0; i < tongueTransformComponent.hitboxes.length; i++) {
      const hitbox = tongueTransformComponent.hitboxes[i];

      const targetDir = hitbox.box.position.angleTo(targetHitbox.box.position);
      
      let acc: number;
      if (i === 0) {
         // Tip
         acc = 2800;
      } else if (i === tongueTransformComponent.hitboxes.length - 1) {
         // Base segment
         acc = 1200;
      } else {
         // Mid segments
         acc = 600;
      }

      applyAcceleration(hitbox, polarVec2(acc, targetDir));
      // Also turn the tip
      if (i === 0) {
         turnHitboxToAngle(hitbox, targetDir, 1, 1, false);
      }
   }

   // Add new segments if needed

   const okrenTransformComponent = TransformComponentArray.getComponent(okren);
   const okrenHitbox = okrenTransformComponent.hitboxes[0];
   
   const tongueBaseHitbox = getTongueBaseHitbox(tongueTransformComponent);
   const distance = okrenHitbox.box.position.distanceTo(tongueBaseHitbox.box.position);

   if (distance >= TONGUE_INITIAL_OFFSET + IDEAL_SEPARATION) {
      addTongueSegment(tongue, okrenHitbox, tongueBaseHitbox, distance);
   }
}

export function startRetractingTongue(tongue: Entity, okrenTongueComponent: OkrenTongueComponent): void {
   if (okrenTongueComponent.isRetracting) {
      return;
   }
   
   okrenTongueComponent.isRetracting = true;

   const tongueTransformComponent = TransformComponentArray.getComponent(tongue);
   const parentOkren = getOkren(tongueTransformComponent);

   const okrenTransformComponent = TransformComponentArray.getComponent(parentOkren);
   const okrenHitbox = okrenTransformComponent.hitboxes[0];

   const tongueBaseHitbox = getTongueBaseHitbox(tongueTransformComponent);
   
   // @Copynpaste
   // Create a tether on the new base hitbox back to the okren to further encourage it!
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 2.5/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   };
   tongueBaseHitbox.angularTethers.push(angularTether);
   // tongueBaseHitbox.tethers.push(createHitboxTether(tongueBaseHitbox, okrenHitbox, 0, 400/60, 0.5, false));

   // Do an initial jerk back of the tongue as the okren reacts to whatever caused it to want to retract its tongue (be it being hit, reaching max length, or catching something)
   for (const hitbox of tongueTransformComponent.hitboxes) {
      const directionToOkren = hitbox.box.position.angleTo(okrenHitbox.box.position);
      addHitboxVelocity(hitbox, polarVec2(200, directionToOkren));
   }
}

const regressTongue = (tongue: Entity, tongueTransformComponent: TransformComponent, okrenTongueComponent: OkrenTongueComponent, okren: Entity): void => {
   const okrenTransformComponent = TransformComponentArray.getComponent(okren);
   const okrenHitbox = okrenTransformComponent.hitboxes[0];
   
   // Move all the segments to the target, but move the tip more
   for (let i = 0; i < tongueTransformComponent.hitboxes.length; i++) {
      const hitbox = tongueTransformComponent.hitboxes[0];

      const homeDir = hitbox.box.position.angleTo(okrenHitbox.box.position);
      
      // @Hack @Incomplete: should pull harder proportional to the amount of resistance the tongue is experiencing
      const MULTIPLIER = 2.3;
      
      let acc: number;
      if (i === 0) {
         // Tip
         acc = 300 * MULTIPLIER;
      } else if (i === tongueTransformComponent.hitboxes.length - 1) {
         // Base segment
         acc = 1500 * MULTIPLIER;
      } else {
         // Mid segments
         acc = 700 * MULTIPLIER;
      }

      applyAcceleration(hitbox, polarVec2(acc, homeDir));
   }

   const tongueBaseHitbox = getTongueBaseHitbox(tongueTransformComponent);

   // remove base segment
   const distance = okrenHitbox.box.position.distanceTo(tongueBaseHitbox.box.position);
   if (distance < TONGUE_INITIAL_OFFSET) {
      let nextBaseSegment: Hitbox | null;
      if (tongueTransformComponent.hitboxes.length > 1) {
         nextBaseSegment = tongueTransformComponent.hitboxes[tongueTransformComponent.hitboxes.length - 2];
      } else {
         nextBaseSegment = null;
      }

      // If the tongue is down to its tip and it's caught something, don't remove it until the catch is dead.
      if (nextBaseSegment === null && okrenTongueComponent.hasCaughtSomething && entityExists(okrenTongueComponent.caughtEntity)) {
         return;
      }
      
      if (nextBaseSegment !== null) {
         // Remove the tethers the next base part has to the one being removed

         let hasFound = false;
         for (let i = 0; i < nextBaseSegment.tethers.length; i++) {
            const tether = nextBaseSegment.tethers[i];
            const otherHitbox = tether.getOtherHitbox(nextBaseSegment);
            if (otherHitbox === tongueBaseHitbox) {
               destroyTether(tether);
               hasFound = true;
               break;
            }
         }
         assert(hasFound);

         hasFound = false;
         for (let i = 0; i < nextBaseSegment.angularTethers.length; i++) {
            const tether = nextBaseSegment.angularTethers[i];
            if (tether.originHitbox === tongueBaseHitbox) {
               nextBaseSegment.angularTethers.splice(i, 1);
               hasFound = true;
               break;
            }
         }
         assert(hasFound);

         // Create a tether on the new base hitbox back to the okren to further encourage it!
         const angularTether: HitboxAngularTether = {
            originHitbox: okrenHitbox,
            idealAngle: 0,
            springConstant: 2.5/60,
            damping: 0.5,
            padding: 0,
            idealHitboxAngleOffset: 0,
            useLeverage: false
         };
         nextBaseSegment.angularTethers.push(angularTether);
         // nextBaseSegmentHitbox.tethers.push(createHitboxTether(nextBaseSegmentHitbox, okrenHitbox, 0, 400/60, 0.5, false));
      } else {
         // final one! !
         const okrenAIHelperComponent = AIHelperComponentArray.getComponent(okren);
         const combatAI = okrenAIHelperComponent.getOkrenCombatAI();
         combatAI.tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);
      }
      
      // Destroy the previous base
      // @INCOMPLETE
      // destroyEntity(tongueBaseEntity);
   } else if (distance >= TONGUE_INITIAL_OFFSET + IDEAL_SEPARATION) {
      addTongueSegment(tongue, okrenHitbox, tongueBaseHitbox, distance);
   }
}

function onTick(tongue: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tongue);
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);

   const length = getTongueLength(transformComponent);
   if (length >= MAX_TONGUE_LENGTH) {
      startRetractingTongue(tongue, okrenTongueComponent);
   }

   const parentOkren = getOkren(transformComponent);
   if (entityExists(parentOkren) && getEntityType(parentOkren) === EntityType.okren) {
      if (okrenTongueComponent.isRetracting) {
         regressTongue(tongue, transformComponent, okrenTongueComponent, parentOkren);
      } else {
         advanceTongue(tongue, transformComponent, okrenTongueComponent, parentOkren);
      }
   }

   if (okrenTongueComponent.hasCaughtSomething && customTickIntervalHasPassed(getEntityAgeTicks(tongue), 0.2)) {
      const tickEvent: EntityTickEvent = {
         type: EntityTickEventType.tongueLick,
         entityID: tongue,
         data: 0
      };
      registerEntityTickEvent(tongue, tickEvent);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const entityIsSnaggable = (entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   if (hitbox.isStatic) {
      return false;
   }

   const mass = getHitboxTotalMassIncludingChildren(hitbox);
   if (mass > 2) {
      return false;
   }

   // @Hack
   if (getEntityType(entity) === EntityType.okrenTongue) {
      return false;
   }

   return true;
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox): void {
   // Only the tip is sticky
   if (!hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_TIP)) {
      return;
   }
   
   const collidingEntity = collidingHitbox.entity;
   if (!entityIsSnaggable(collidingEntity)) {
      return;
   }

   // Don't snag if the hitbox is already tethered
   for (const tether of collidingHitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(collidingHitbox);
      if (otherHitbox === hitbox) {
         return;
      }
   }

   const tongue = hitbox.entity;

   tetherHitboxes(hitbox, collidingHitbox, 0, 100, 2);

   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   startRetractingTongue(tongue, okrenTongueComponent);
   okrenTongueComponent.hasCaughtSomething = true;
   // @Hack
   okrenTongueComponent.caughtEntity = collidingEntity;

   const tickEvent: EntityTickEvent = {
      type: EntityTickEventType.tongueGrab,
      entityID: tongue,
      data: 0
   };
   registerEntityTickEvent(tongue, tickEvent);
}

function onTakeDamage(tongue: Entity): void {
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   startRetractingTongue(tongue, okrenTongueComponent);
}