import { angle, angleToPoint, assert, distance, getAngleDiff } from "battletribes-shared";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent.js";
import { addHitboxAngularAcceleration, applyForce, getHitboxAngularVelocity, getHitboxTotalMassIncludingChildren, getHitboxVelocity, Hitbox } from "./hitboxes.js";

export class HitboxTether {
   public readonly hitbox1: Hitbox;
   public readonly hitbox2: Hitbox;
   
   public readonly idealDistance: number;
   public readonly springConstant: number;
   public readonly damping: number;

   constructor(hitbox1: Hitbox, hitbox2: Hitbox, idealDistance: number, springConstant: number, damping: number) {
      this.hitbox1 = hitbox1;
      this.hitbox2 = hitbox2;
      this.idealDistance = idealDistance;
      this.springConstant = springConstant;
      this.damping = damping;
   }

   // @Cleanup @Robustness: would be nice to find a way to rework tethers so that this function doesn't need to be called, completely eliminating the potential for an error to be thrown
   public getOtherHitbox(hitbox: Hitbox): Hitbox {
      if (this.hitbox1 === hitbox) {
         return this.hitbox2;
      }
      if (this.hitbox2 === hitbox) {
         return this.hitbox1;
      }
      throw new Error();
   }
}

export interface HitboxAngularTether {
   readonly hitbox: Hitbox;
   readonly originHitbox: Hitbox;
   readonly idealAngle: number;
   readonly springConstant: number;
   readonly damping: number;
   /** Radians either side of the ideal angle for which the link is allowed to be in without being pulled */
   readonly padding: number;

   // @HACK: haven't fully thought this through; it's extremely unclear what this is to people reading through this (HI! if anyone else does read this)
   readonly idealHitboxAngleOffset: number;

   /** If true, then the tether will be as effective at maintaining the restriction at long distances as it is at short distances. If false then the force used to correct the restriction will be the same regardless of distance between the hitboxes. */
   readonly useLeverage: boolean;
}

/** Puts an angular spring on the hitbox's relative angle. */
export interface HitboxRelativeAngleConstraint {
   readonly hitbox: Hitbox;
   readonly idealAngle: number;
   readonly springConstant: number;
   readonly damping: number;
}

const tethers: Array<HitboxTether> = [];
const tethersMap = new WeakMap<Hitbox, Array<HitboxTether>>();

const angularTethers: Array<HitboxAngularTether> = [];
const angularTethersMap = new WeakMap<Hitbox, Array<HitboxAngularTether>>();

// @Cleanup: isn't this just an angular tether...
const angularConstraints: Array<HitboxRelativeAngleConstraint> = [];
const angularConstraintsMap = new WeakMap<Hitbox, Array<HitboxRelativeAngleConstraint>>();

const addTetherToEntity = (hitbox: Hitbox, tether: HitboxTether): void => {
   const existingTethers = tethersMap.get(hitbox);
   if (existingTethers === undefined) {
      tethersMap.set(hitbox, [tether]);
   } else {
      existingTethers.push(tether);
   }
}

const addAngularTetherToEntity = (hitbox: Hitbox, angularTether: HitboxAngularTether): void => {
   const existingAngularTethers = angularTethersMap.get(hitbox);
   if (existingAngularTethers === undefined) {
      angularTethersMap.set(hitbox, [angularTether]);
   } else {
      existingAngularTethers.push(angularTether);
   }
}

const addAngularConstraintToEntity = (hitbox: Hitbox, constraint: HitboxRelativeAngleConstraint): void => {
   const existingAngularConstraints = angularConstraintsMap.get(hitbox);
   if (existingAngularConstraints === undefined) {
      angularConstraintsMap.set(hitbox, [constraint]);
   } else {
      existingAngularConstraints.push(constraint);
   }
}

export function tetherHitboxes(hitbox1: Hitbox, hitbox2: Hitbox, idealDistance: number, springConstant: number, damping: number): void {
   const tether = new HitboxTether(hitbox1, hitbox2, idealDistance, springConstant, damping);
   
   addTetherToEntity(hitbox1, tether);
   addTetherToEntity(hitbox2, tether);

   // Don't add the tether to the global tethers array here, cuz we wait until it's added to the world
}

// @Cleanup: rename to "tetherHitboxesAngular" if i do so
export function addHitboxAngularTether(hitbox: Hitbox, angularTether: HitboxAngularTether): void {
   addAngularTetherToEntity(hitbox, angularTether);
}

export function addHitboxAngularConstraint(hitbox: Hitbox, constraint: HitboxRelativeAngleConstraint): void {
   addAngularConstraintToEntity(hitbox, constraint);
}

export function getHitboxTethers(hitbox: Hitbox): ReadonlyArray<HitboxTether> | undefined {
   return tethersMap.get(hitbox);
}

export function getHitboxAngularTethers(hitbox: Hitbox): Array<HitboxAngularTether> | undefined {
   return angularTethersMap.get(hitbox);
}

export function getHitboxAngularConstraints(hitbox: Hitbox): Array<HitboxRelativeAngleConstraint> | undefined {
   return angularConstraintsMap.get(hitbox);
}

const tetherIsInWorld = (tether: HitboxTether): boolean => {
   // @SPEED
   return tethers.indexOf(tether) !== -1;
}

export function addEntityTethersToWorld(transformComponent: TransformComponent): void {
   for (const hitbox of transformComponent.hitboxes) {
      const hitboxTethers = tethersMap.get(hitbox);
      if (hitboxTethers !== undefined) {
         for (const tether of hitboxTethers) {
            if (!tetherIsInWorld(tether)) {
               tethers.push(tether);
            }
         }
      }
   }
}

export function destroyTether(tether: HitboxTether): void {
   let idx = tethers.indexOf(tether);
   assert(idx !== -1);
   tethers.splice(idx, 1);
   
   const hitbox1Tethers = tethersMap.get(tether.hitbox1);
   assert(hitbox1Tethers !== undefined);
   idx = hitbox1Tethers.indexOf(tether);
   assert(idx !== -1);
   hitbox1Tethers.splice(idx, 1);
   
   const hitbox2Tethers = tethersMap.get(tether.hitbox2);
   assert(hitbox2Tethers !== undefined);
   idx = hitbox2Tethers.indexOf(tether);
   assert(idx !== -1);
   hitbox2Tethers.splice(idx, 1);
}

const applyTether = (tether: HitboxTether): void => {
   const hitbox1 = tether.hitbox1;
   const hitbox2 = tether.hitbox2;

   const diffX = hitbox2.box.posX - hitbox1.box.posX;
   const diffY = hitbox2.box.posY - hitbox1.box.posY;
   const distance = Math.sqrt(diffX * diffX + diffY * diffY);
   if (distance === 0) {
      return;
   }

   const normalisedDiffX = diffX / distance;
   const normalisedDiffY = diffY / distance;

   const displacement = distance - tether.idealDistance;
   
   // Calculate spring force
   const springForceX = normalisedDiffX * tether.springConstant * displacement;
   const springForceY = normalisedDiffY * tether.springConstant * displacement;

   const hitboxVelocity = getHitboxVelocity(hitbox1);
   const originHitboxVelocity = getHitboxVelocity(hitbox2);

   const relVelX = hitboxVelocity.x - originHitboxVelocity.x;
   const relVelY = hitboxVelocity.y - originHitboxVelocity.y;

   const dampingForceX = -relVelX * tether.damping;
   const dampingForceY = -relVelY * tether.damping;

   const forceX = springForceX + dampingForceX;
   const forceY = springForceY + dampingForceY;
   
   applyForce(hitbox1, forceX, forceY);
   applyForce(hitbox2, -forceX, -forceY);

   // @Speed: Does this need to be done every time?
   const transformComponent1 = TransformComponentArray.getComponent(hitbox1.entity);
   const transformComponent2 = TransformComponentArray.getComponent(hitbox2.entity);
   transformComponent1.isDirty = true;
   transformComponent2.isDirty = true;
}

const applyAngularTether = (angularTether: HitboxAngularTether): void => {
   const hitbox = angularTether.hitbox;
   const originHitbox = angularTether.originHitbox;

   const originToHitboxDirection = angle(hitbox.box.posX - originHitbox.box.posX, hitbox.box.posY - originHitbox.box.posY);
   const idealAngle = originHitbox.box.angle + angularTether.idealAngle;
   
   const directionDiff = getAngleDiff(originToHitboxDirection, idealAngle);
   
   if (Math.abs(directionDiff) > angularTether.padding) {
      const rotationForce = (directionDiff - angularTether.padding * Math.sign(directionDiff)) * angularTether.springConstant;

      const hitboxAccDir = originToHitboxDirection + Math.PI/2;
      const originHitboxAccDir = originToHitboxDirection - Math.PI/2;
      
      const hitboxTorque = getHitboxVelocity(hitbox).scalarProj(angleToPoint(hitboxAccDir));
      const originHitboxTorque = getHitboxVelocity(originHitbox).scalarProj(angleToPoint(originHitboxAccDir));
      
      const relVel = hitboxTorque - originHitboxTorque;
      const dampingForce = -relVel * angularTether.damping;
      
      // @HACK: the * 0.1
      let force = (rotationForce + dampingForce) * 0.1;

      if (angularTether.useLeverage) {
         force *= distance(originHitbox.box.posX, originHitbox.box.posY, hitbox.box.posX, hitbox.box.posY);
      }

      // @HACK: the * 4
      applyForce(hitbox, force * 4 * Math.sin(hitboxAccDir), force * 4 * Math.cos(hitboxAccDir));

      // @HACK: the * 4
      // @Speed: don't need to call 2nd polarVec2 cuz this is in the exact reverse direction
      applyForce(originHitbox, force * 4 * Math.sin(originHitboxAccDir), force * 4 * Math.cos(originHitboxAccDir));
   }

   // Restrict the hitboxes' angle to match its direction
   const angleDiff = getAngleDiff(hitbox.box.angle, originToHitboxDirection + angularTether.idealHitboxAngleOffset);
   // @Hack @Cleanup: hardcoded for cow head
   // const anglePadding = 0.3;
   const anglePadding = 0.05;
   const angleSpringConstant = 15;
   const angleDamping = 0.8;
   if (Math.abs(angleDiff) > anglePadding) {
      const rotationForce = (angleDiff - anglePadding * Math.sign(angleDiff)) * angleSpringConstant;

      const dampingForce = -getHitboxAngularVelocity(hitbox) * angleDamping;

      const force = rotationForce + dampingForce;
      addHitboxAngularAcceleration(hitbox, force / getHitboxTotalMassIncludingChildren(hitbox));
   }
}

const applyRelativeAngleConstraint = (constraint: HitboxRelativeAngleConstraint): void => {
   const hitbox = constraint.hitbox;
   
   // Restrict the hitboxes' angle to match its direction
   const angleDiff = getAngleDiff(hitbox.box.relativeAngle, constraint.idealAngle);
   // @Hack @Cleanup: hardcoded
   const anglePadding = 0;
   if (Math.abs(angleDiff) > anglePadding) {
      const rotationForce = (angleDiff - anglePadding * Math.sign(angleDiff)) * constraint.springConstant;

      const dampingForce = -getHitboxAngularVelocity(hitbox) * constraint.damping;

      const force = rotationForce + dampingForce;
      
      addHitboxAngularAcceleration(hitbox, force / getHitboxTotalMassIncludingChildren(hitbox));
   }
}

export function applyTethers(): void {
   for (const tether of tethers) {
      applyTether(tether);
   }
}

export function applyAngularTethers(): void {
   for (const tether of angularTethers) {
      applyAngularTether(tether);
   }
}

export function applyAngularConstraints(): void {
   for (const constraint of angularConstraints) {
      applyRelativeAngleConstraint(constraint);
   }
}