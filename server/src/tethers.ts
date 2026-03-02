import { Point } from "../../shared/src/utils";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { applyForce, getHitboxVelocity, Hitbox } from "./hitboxes";

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

const tethers = new Array<HitboxTether>();

export function tetherHitboxes(hitbox1: Hitbox, hitbox2: Hitbox, idealDistance: number, springConstant: number, damping: number): void {
   const tether = new HitboxTether(hitbox1, hitbox2, idealDistance, springConstant, damping);
   
   hitbox1.tethers.push(tether);
   hitbox2.tethers.push(tether);

   // We don't add the tether to the global tethers array here, cuz we wait until it's added to the world
}

const tetherIsInWorld = (tether: HitboxTether): boolean => {
   // @SPEED
   return tethers.indexOf(tether) !== -1;
}

export function addEntityTethersToWorld(transformComponent: TransformComponent): void {
   for (const hitbox of transformComponent.hitboxes) {
      for (const tether of hitbox.tethers) {
         if (!tetherIsInWorld(tether)) {
            tethers.push(tether);
         }
      }
   }
}

export function destroyTether(tether: HitboxTether): void {
   let idx = tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tethers.splice(idx, 1);
   
   idx = tether.hitbox1.tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tether.hitbox1.tethers.splice(idx, 1);
   
   idx = tether.hitbox2.tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tether.hitbox2.tethers.splice(idx, 1);
}

const applyTether = (tether: HitboxTether): void => {
   const hitbox1 = tether.hitbox1;
   const hitbox2 = tether.hitbox2;

   const diffX = hitbox2.box.position.x - hitbox1.box.position.x;
   const diffY = hitbox2.box.position.y - hitbox1.box.position.y;
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
   
   applyForce(hitbox1, new Point(forceX, forceY));
   applyForce(hitbox2, new Point(-forceX, -forceY));

   // @Speed: Does this need to be done every time?
   const transformComponent1 = TransformComponentArray.getComponent(hitbox1.entity);
   const transformComponent2 = TransformComponentArray.getComponent(hitbox2.entity);
   transformComponent1.isDirty = true;
   transformComponent2.isDirty = true;
}

export function applyTethers(): void {
   for (const tether of tethers) {
      applyTether(tether);
   }
}