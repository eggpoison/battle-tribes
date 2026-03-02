import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { assert, clampToSubtileBoardDimensions, distance, getAbsAngleDiff, Point, positionIsInWorld, randAngle, randFloat, randInt, secondsToTicks } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox, willStopAtDesiredDistance } from "../ai-shared";
import { getOkrenPreyTarget, getOkrenThreatTarget, runOkrenCombatAI } from "../ai/OkrenCombatAI";
import { runSandBallingAI, updateSandBallingAI } from "../ai/SandBallingAI";
import { createEntityConfigAttachInfo } from "../components";
import { createDustfleaEggConfig } from "../entities/desert/dustflea-egg";
import { createOkrenClawConfig } from "../entities/desert/okren-claw";
import { addHitboxAngularVelocity, getHitboxAngularVelocity, getHitboxVelocity, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { createEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { getEntityFullness } from "./EnergyStomachComponent";
import { OkrenClawGrowthStage } from "./OkrenClawComponent";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";
import { TamingComponentArray } from "./TamingComponent";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { getAvailableCarrySlot, mountCarrySlot, RideableComponentArray } from "./RideableComponent";

export const enum OkrenAgeStage {
   juvenile,
   youth,
   adult,
   elder,
   ancient
}

export const enum OkrenSide {
   right,
   left
}

export const enum OkrenSwingState {
   resting,
   /** Pulls the arm back a bit to build up more momentum for the swing */
   poising,
   raising,
   swinging,
   returning
}

export interface OkrenHitboxIdealAngles {
   readonly bigIdealAngle: number;
   readonly mediumIdealAngle: number;
   readonly smallIdealAngle: number;
}

export const OKREN_SIDES = [OkrenSide.right, OkrenSide.left];

// @Cleanup: shit name expoerted!
export const restingIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.25,
   mediumIdealAngle: -Math.PI * 0.4,
   smallIdealAngle: -Math.PI * 0.65
};
// @Cleanup: shit name expoerted!
export const poisedIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.35,
   mediumIdealAngle: -Math.PI * 0.35,
   smallIdealAngle: -Math.PI * 0.5
};
const raisedIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: Math.PI * 0.15,
   mediumIdealAngle: -Math.PI * 0.05,
   smallIdealAngle: Math.PI * 0.05
};
const swungIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: -Math.PI * 0.1,
   mediumIdealAngle: -Math.PI * 0.6,
   smallIdealAngle: -Math.PI * 0.3
};

const layingIdealAngles: OkrenHitboxIdealAngles = {
   bigIdealAngle: -Math.PI * 0.25,
   mediumIdealAngle: -Math.PI * 0.4,
   smallIdealAngle: -Math.PI * 0.65
};

const KRUMBLID_PEACE_TIME_TICKS = 5 * Settings.TICK_RATE;

const MIN_DUSTFLEA_GESTATION_TIME = 3 * Settings.TICK_RATE;
const MAX_DUSTFLEA_GESTATION_TIME = 5 * Settings.TICK_RATE;

const DUSTFLEA_EGG_LAY_TIME_TICKS = Settings.TICK_RATE;

const LIMB_REGROW_TIME = 60 * Settings.TICK_RATE;

export class OkrenComponent {
   public size: OkrenAgeStage;
   
   public swingStates = [OkrenSwingState.resting, OkrenSwingState.resting];
   public ticksInStates = [0, 0];
   public currentSwingSide = OkrenSide.right;

   public remainingPeaceTimeTicks = 0;

   public dustfleaGestationTimer = randInt(MIN_DUSTFLEA_GESTATION_TIME, MAX_DUSTFLEA_GESTATION_TIME);
   public numEggsReady = 0;
   public isLayingEggs = false;
   public eggLayTimer = 0;
   public eggLayPosition = new Point(0, 0);

   public isProtectingEggs = false;

   /** If an element is greater than 0, it means that the corresponding eye is hardened */
   public eyeHardenTimers = [0, 0];

   public limbRegrowTimes = [LIMB_REGROW_TIME, LIMB_REGROW_TIME];

   constructor(size: OkrenAgeStage) {
      this.size = size;
   }
}

export const OkrenComponentArray = new ComponentArray<OkrenComponent>(ServerComponentType.okren, true, getDataLength, addDataToPacket);
OkrenComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
OkrenComponentArray.onHitboxCollision = onHitboxCollision;
OkrenComponentArray.onTakeDamage = onTakeDamage;
OkrenComponentArray.getDamageTakenMultiplier = getDamageTakenMultiplier;

const setOkrenHitboxIdealAngles = (okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles, bigTurnSpeed: number, mediumTurnSpeed: number, smallTurnSpeed: number): void => {
   // @Hack
   bigTurnSpeed *= 3;
   mediumTurnSpeed *= 3;
   smallTurnSpeed *= 3;
   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.okrenClaw) {
            const clawTransformComponent = TransformComponentArray.getComponent(childHitbox.entity);
            for (const hitbox of clawTransformComponent.hitboxes) {
               const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
               if (isRightSide !== (side === OkrenSide.right)) {
                  continue;
               }
               
               if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
                  turnHitboxToAngle(hitbox, idealAngles.bigIdealAngle, bigTurnSpeed, 0.28, true);
               } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
                  turnHitboxToAngle(hitbox, idealAngles.mediumIdealAngle, mediumTurnSpeed, 0.24, true);
               } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
                  turnHitboxToAngle(hitbox, idealAngles.smallIdealAngle, smallTurnSpeed, 0.2, true);
               }
            }
         }
      }
   }
}

export function okrenHitboxesHaveReachedIdealAngles(okren: Entity, side: OkrenSide, idealAngles: OkrenHitboxIdealAngles): boolean {
   const EPSILON = 0.1;

   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.okrenClaw) {
            const clawTransformComponent = TransformComponentArray.getComponent(childHitbox.entity);
            for (const hitbox of clawTransformComponent.hitboxes) {
               const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
               if (isRightSide !== (side === OkrenSide.right)) {
                  continue;
               }
               
               if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
                  if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.bigIdealAngle) > EPSILON) {
                     return false;
                  }
               } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
                  if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.mediumIdealAngle) > EPSILON) {
                     return false;
                  }
               } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
                  if (getAbsAngleDiff(hitbox.box.relativeAngle, idealAngles.smallIdealAngle) > EPSILON) {
                     return false;
                  }
               }
            }
         }
      }
   }

   return true;
}

export function getOkrenMandibleHitbox(okren: Entity, side: OkrenSide): Hitbox | null {
   const transformComponent = TransformComponentArray.getComponent(okren);
   for (const hitbox of transformComponent.hitboxes) {
      const isRightSide = hitbox.box.totalFlipXMultiplier === 1;
      if (isRightSide !== (side === OkrenSide.right)) {
         continue;
      }
      
      if (hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
         return hitbox;
      }
   }

   return null;
}

const hasFleas = (okren: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(okren);

   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.dustflea) {
            return true;
         }
      }
   }

   return false;
}

// @Copynpaste from KrumblidHibernateAI

const getRandomNearbyPosition = (krumblid: Entity): Point => {
   const krumblidTransformComponent = TransformComponentArray.getComponent(krumblid);
   const krumblidHitbox = krumblidTransformComponent.hitboxes[0];

   const RANGE = 600;
   
   let x: number;
   let y: number;
   do {
      x = krumblidHitbox.box.position.x + randFloat(-RANGE, RANGE);
      y = krumblidHitbox.box.position.y + randFloat(-RANGE, RANGE);
   } while (distance(krumblidHitbox.box.position.x, krumblidHitbox.box.position.y, x, y) > RANGE || !positionIsInWorld(x, y))

   return new Point(x, y);
}

const isValidEggLayPosition = (okren: Entity, position: Point): boolean => {
   const layer = getEntityLayer(okren);

   // Nake sure it isn't near a wall
   const WALL_CHECK_RANGE = 350;

   const minSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const minSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

   const testHitbox = new CircularBox(position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
   
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex)) {
            // @Speed
            const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
            // @Copynpaste
            const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
            const collisionResult = testHitbox.getCollisionResult(tileBox);
            if (collisionResult.isColliding) {
               return false;
            }
         }
      }
   }

   return true;
}

const hasClaw = (okrenTransformComponent: TransformComponent, side: OkrenSide): boolean => {
   for (const hitbox of okrenTransformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) !== EntityType.okrenClaw) {
            continue;
         }

         const clawTransformComponent = TransformComponentArray.getComponent(childHitbox.entity);
         const rootHitbox = clawTransformComponent.hitboxes[0];
         if (rootHitbox.box.flipX === (side === OkrenSide.left ? true : false)) {
            return true;
         }
      }
   }

   return false;
}

// @Copynpaste from KrumblidHibernateAI

function onTick(okren: Entity): void {
   const okrenTransformComponent = TransformComponentArray.getComponent(okren);
   const okrenBodyHitbox = okrenTransformComponent.hitboxes[0];

   const okrenComponent = OkrenComponentArray.getComponent(okren);

   // Regrow limbs if they are lost
   for (const side of OKREN_SIDES) {
      if (!hasClaw(okrenTransformComponent, side)) {
         if (okrenComponent.limbRegrowTimes[side] === 0) {
            const sideIsFlipped = side === OkrenSide.left ? true : false;
            const clawConfig = createOkrenClawConfig(okrenBodyHitbox.box.position.copy(), 0, okrenComponent.size, OkrenClawGrowthStage.ONE, sideIsFlipped);
            const clawRootHitbox = clawConfig.components[ServerComponentType.transform]!.hitboxes[0];
            clawConfig.attachInfo = createEntityConfigAttachInfo(clawRootHitbox, okrenBodyHitbox, true);
            createEntity(clawConfig, getEntityLayer(okren), 0);
            okrenComponent.limbRegrowTimes[side] = LIMB_REGROW_TIME;
         } else {
            okrenComponent.limbRegrowTimes[side]--;
         }
      }
   }
   
   // @HACK: this should really be like some muscle or restriction thing defined when the okren is created.
   // Cuz what if this function gets disabled or when this gets abstracted into an AI component and the okren's AI gets turned off?
   for (const side of OKREN_SIDES) {
      const minAngle = -Math.PI * 0.4;
      const maxAngle = Math.PI * 0.2;

      const mandibleHitbox = getOkrenMandibleHitbox(okren, side);
      if (mandibleHitbox !== null) {
         if (mandibleHitbox.box.relativeAngle < minAngle) {
            mandibleHitbox.box.relativeAngle = minAngle;
            mandibleHitbox.previousRelativeAngle = minAngle;
         } else if (mandibleHitbox.box.relativeAngle > maxAngle) {
            mandibleHitbox.box.relativeAngle = maxAngle;
            mandibleHitbox.previousRelativeAngle = maxAngle;
         }
      }
   }

   if (okrenComponent.remainingPeaceTimeTicks > 0) {
      okrenComponent.remainingPeaceTimeTicks--;
   }

   // @HACK: hardcoded so that when >= 0.5, doesn't look for food and gestates eggs, when < 0.5, looks for food doesn't gestate
   if (getEntityFullness(okren) >= 0.5) {
      if (okrenComponent.dustfleaGestationTimer > 0) {
         okrenComponent.dustfleaGestationTimer--;
      } else {
         okrenComponent.dustfleaGestationTimer = randInt(MIN_DUSTFLEA_GESTATION_TIME, MAX_DUSTFLEA_GESTATION_TIME);
         okrenComponent.numEggsReady++;
      }
   }
   
   okrenComponent.ticksInStates[0]++;
   okrenComponent.ticksInStates[1]++;

   for (const side of OKREN_SIDES) {
      switch (okrenComponent.swingStates[side]) {
         case OkrenSwingState.resting: {
            setOkrenHitboxIdealAngles(okren, side, restingIdealAngles, 1.2 * Math.PI, 3 * Math.PI, 3 * Math.PI);
            break;
         }
         case OkrenSwingState.poising: {
            setOkrenHitboxIdealAngles(okren, side, poisedIdealAngles, 2.1 * Math.PI, 2.4 * Math.PI, 2.4 * Math.PI);
            break;
         }
         case OkrenSwingState.raising: {
            setOkrenHitboxIdealAngles(okren, side, raisedIdealAngles, 3.6 * Math.PI, 4.5 * Math.PI, 6.75 * Math.PI);
            break;
         }
         case OkrenSwingState.swinging: {
            setOkrenHitboxIdealAngles(okren, side, swungIdealAngles, 2.4 * Math.PI, 3 * Math.PI, 1.5 * Math.PI);
            break;
         }
         case OkrenSwingState.returning: {
            break;
         }
      }
   }
   
   for (const side of OKREN_SIDES) {
      if (okrenComponent.swingStates[side] === OkrenSwingState.poising && okrenHitboxesHaveReachedIdealAngles(okren, side, poisedIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.raising;
         okrenComponent.ticksInStates[side] = 0;
      }  else if (okrenComponent.swingStates[side] === OkrenSwingState.raising && okrenHitboxesHaveReachedIdealAngles(okren, side, raisedIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.swinging;
         okrenComponent.ticksInStates[side] = 0;
      } else if (okrenComponent.swingStates[side] === OkrenSwingState.swinging && okrenHitboxesHaveReachedIdealAngles(okren, side, swungIdealAngles)) {
         okrenComponent.swingStates[side] = OkrenSwingState.resting;
         okrenComponent.ticksInStates[side] = 0;
      }
   }

   for (const side of OKREN_SIDES) {
      if (okrenComponent.eyeHardenTimers[side] > 0) {
         okrenComponent.eyeHardenTimers[side]--;
      }
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(okren);

   const combatAI = aiHelperComponent.getOkrenCombatAI();
   
   // If the okren is being directed to attack something, attack it
   const tamingComponent = TamingComponentArray.getComponent(okren);
   if (entityExists(tamingComponent.attackTarget)) {
      runOkrenCombatAI(okren, aiHelperComponent, combatAI, tamingComponent.attackTarget);
      return;
   }
   
   // Go to follow target if possible
   // @Copynpaste
   if (entityExists(tamingComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      aiHelperComponent.moveFunc(okren, targetHitbox.box.position, 350);
      aiHelperComponent.turnFunc(okren, targetHitbox.box.position, 0.5 * Math.PI, 0.6);
      return;
   }
   
   // @Hack @Copynpaste
   // Pick up carry target
   if (entityExists(tamingComponent.carryTarget)) {
      const rideableComponent = RideableComponentArray.getComponent(okren);
      const carrySlot = getAvailableCarrySlot(rideableComponent);
      if (carrySlot !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.carryTarget);
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         const targetDirection = okrenBodyHitbox.box.position.angleTo(targetHitbox.box.position);
         aiHelperComponent.moveFunc(okren, targetHitbox.box.position, 350);
         aiHelperComponent.turnFunc(okren, targetHitbox.box.position, 0.5 * Math.PI, 0.6);

         // Force carry if colliding and head is looking at the carry target
         if (getAbsAngleDiff(okrenBodyHitbox.box.angle, targetDirection) < 0.1 && entitiesAreColliding(okren, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
            mountCarrySlot(tamingComponent.carryTarget, carrySlot);
            tamingComponent.carryTarget = 0;
         }
         return;
      }
   }
   
   const threatTarget = getOkrenThreatTarget(okren, aiHelperComponent);
   if (threatTarget !== null) {
      runOkrenCombatAI(okren, aiHelperComponent, combatAI, threatTarget);
      return;
   }

   // @TEMPORARY cuz eggs crash the game rn following the hitboxes rework O_O_O

   // if (okrenComponent.numEggsReady >= 5 && !okrenComponent.isLayingEggs) {
   //    // Wait until the okren finds a good spot to lay eggs
   //    if (getEntityAgeTicks(okren) % Math.floor(Settings.TICK_RATE / 4) === 0) {
   //       const potentialPosition = getRandomNearbyPosition(okren);
   //       if (isValidEggLayPosition(okren, potentialPosition)) {
   //          okrenComponent.eggLayPosition = potentialPosition;
   //          okrenComponent.isLayingEggs = true;
   //       }
   //    }
   // }
   
   // if (okrenComponent.isProtectingEggs) {
   //    // Turn to face teh egg lay position
   //    const angleToLayPosition = okrenBodyHitbox.box.position.angleTo(okrenComponent.eggLayPosition);
   //    const distance = getDistanceFromPointToHitbox(okrenComponent.eggLayPosition, okrenBodyHitbox);
      
   //    if (getAbsAngleDiff(okrenBodyHitbox.box.angle, angleToLayPosition) < 0.2 && Math.abs(getHitboxAngularVelocity(okrenBodyHitbox)) < 0.2) {
   //       // Is facing correct angle to ball up sand

   //       if (willStopAtDesiredDistance(okrenBodyHitbox, 40, distance)) {
   //          // @Copynpaste
   //          turnHitboxToAngle(okrenBodyHitbox, angleToLayPosition, 0.5 * Math.PI, 0.75, false);
   
   //          const sandBallingAI = aiHelperComponent.getSandBallingAI();
   //          updateSandBallingAI(sandBallingAI);
   //          runSandBallingAI(okren, aiHelperComponent, sandBallingAI);
   //       } else {
   //          aiHelperComponent.moveFunc(okren, okrenComponent.eggLayPosition, 350);
   //          aiHelperComponent.turnFunc(okren, okrenComponent.eggLayPosition, 0.5 * Math.PI, 0.6);
   //       }
   //    } else {
   //       // Isn't facing correct angle to ball up sand
         
   //       // If the okren is too close to turn around without scattering the eggs, move back
   //       if (willStopAtDesiredDistance(okrenBodyHitbox, 75, distance)) {
   //          const targetPos = okrenBodyHitbox.box.position.offset(1, angleToLayPosition + Math.PI);
            
   //          aiHelperComponent.moveFunc(okren, targetPos, 350);
   //          aiHelperComponent.turnFunc(okren, targetPos, 0.5 * Math.PI, 0.6);
   //       } else {
   //          if (getHitboxVelocity(okrenBodyHitbox).magnitude() < 30) {
   //             // @Copynpaste
   //             turnHitboxToAngle(okrenBodyHitbox, angleToLayPosition, 0.5 * Math.PI, 0.75, false);
   //          }
   //       }
   //    }
   //    return;
   // } else if (okrenComponent.isLayingEggs) {
   //    const distance = getDistanceFromPointToHitbox(okrenComponent.eggLayPosition, okrenBodyHitbox);
   //    if (willStopAtDesiredDistance(okrenBodyHitbox, 60, distance)) {
   //       // Once in range, turn to face away from the lay position
   //       const targetAngle = okrenBodyHitbox.box.position.angleTo(okrenComponent.eggLayPosition) + Math.PI;
   //       turnHitboxToAngle(okrenBodyHitbox, targetAngle, 0.5 * Math.PI, 0.75, false);

   //       if (getAbsAngleDiff(okrenBodyHitbox.box.angle, targetAngle) < 0.2 && Math.abs(getHitboxAngularVelocity(okrenBodyHitbox)) < 0.2) {
   //          for (const side of OKREN_SIDES) {
   //             setOkrenHitboxIdealAngles(okren, side, layingIdealAngles, 1.2 * Math.PI, 3 * Math.PI, 3 * Math.PI);
   //          }

   //          if (++okrenComponent.eggLayTimer >= DUSTFLEA_EGG_LAY_TIME_TICKS) {
   //             assert(okrenComponent.numEggsReady > 0);
      
   //             const hitboxRadius = (okrenBodyHitbox.box as CircularBox).radius;
               
   //             const eggPosition = okrenBodyHitbox.box.position.offset(hitboxRadius + 2, Math.PI + okrenBodyHitbox.box.angle + randFloat(-0.15, 0.15));
      
   //             const eggConfig = createDustfleaEggConfig(eggPosition, randAngle(), okren);
   //             createEntity(eggConfig, getEntityLayer(okren), 0);
               
   //             okrenComponent.eggLayTimer = 0;
   //             okrenComponent.numEggsReady--;
      
   //             // @Hack: entity is the okren because the dustflea egg isn't created yet so the function can't get the transform component of it
   //             const tickEvent: EntityTickEvent = {
   //                type: EntityTickEventType.dustfleaEggPop,
   //                entityID: okren,
   //                data: 0
   //             };
   //             registerEntityTickEvent(okren, tickEvent);
   //          }
   //       }
   //    } else {
   //       // @Hack @Cleanup: really bad place to define the acceleration and turn speed
   //       aiHelperComponent.moveFunc(okren, okrenComponent.eggLayPosition, 350);
   //       aiHelperComponent.turnFunc(okren, okrenComponent.eggLayPosition, 1.6 * Math.PI, 0.6);
   //    }
         
   //    if (okrenComponent.numEggsReady === 0) {
   //       // Once all eggs are laid, switch to balling up sand around them to protect them
   //       okrenComponent.isProtectingEggs = true;
   //    }

   //    return;
   // }

   if (okrenComponent.numEggsReady >= 5 && !okrenComponent.isLayingEggs) {
      // Wait until the okren finds a good spot to lay eggs
      if (getEntityAgeTicks(okren) % Math.floor(Settings.TICK_RATE / 4) === 0) {
         const potentialPosition = getRandomNearbyPosition(okren);
         if (isValidEggLayPosition(okren, potentialPosition)) {
            okrenComponent.eggLayPosition = potentialPosition;
            okrenComponent.isLayingEggs = true;
         }
      }
   }

   if (getEntityFullness(okren) < 0.5) {
      const preyTarget = getOkrenPreyTarget(okren, aiHelperComponent);
      if (preyTarget !== null) {
         if (hasFleas(okren)) {
            okrenComponent.remainingPeaceTimeTicks = KRUMBLID_PEACE_TIME_TICKS;
         } else if (okrenComponent.remainingPeaceTimeTicks === 0) {
            runOkrenCombatAI(okren, aiHelperComponent, combatAI, preyTarget);
         }
         return;
      }
   }
   
   // By default, move the krumblids' arms back to their resting position
   const idealAngles: OkrenHitboxIdealAngles = {
      bigIdealAngle: Math.PI * 0.2,
      mediumIdealAngle: -Math.PI * 0.8,
      smallIdealAngle: -Math.PI * 0.9
   };
   for (const side of OKREN_SIDES) {
      setOkrenHitboxIdealAngles(okren, side, idealAngles, 1 * Math.PI, 1 * Math.PI, 1 * Math.PI);
   }
   
   // Wander AI
   // @Temporary for shot
   // const wanderAI = aiHelperComponent.getWanderAI();
   // wanderAI.update(okren);
   // if (wanderAI.targetPositionX !== -1) {
   //    // @Hack @Cleanup: really bad place to define the acceleration and turn speed
   //    aiHelperComponent.move(okren, 350, Math.PI * 1.6, wanderAI.targetPositionX, wanderAI.targetPositionY);
   // }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, okren: Entity): void {
   const okrenComponent = OkrenComponentArray.getComponent(okren);
   packet.writeNumber(okrenComponent.size);
   packet.writeNumber(okrenComponent.eyeHardenTimers[0]);
   packet.writeNumber(okrenComponent.eyeHardenTimers[1]);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   // @HACK so that okrens don't immediately kill the dustflea eggs they create
   if (getEntityType(collidingEntity) === EntityType.dustfleaEgg) {
      return;
   }
   
   // @Hack: mandible attacking
   if (!hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
      return;
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const okren = hitbox.entity;

   const hash = "okrenmandible_" + okren + "_" + hitbox.localID;
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, hash)) {
      return;
   }
   damageEntity(collidingHitbox, okren, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, hash, 0.3);
}

function onTakeDamage(okren: Entity, hitHitbox: Hitbox): void {
   if (hitHitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
      // @Hack: entity is the okren because the dustflea egg isn't created yet so the function can't get the transform component of it
      const tickEvent: EntityTickEvent = {
         type: EntityTickEventType.okrenEyeHitSound,
         entityID: okren,
         data: 0
      };
      registerEntityTickEvent(okren, tickEvent);

      // Make the eye harden for a bit
      const isLeftSide = hitHitbox.box.flipX;
      const i = isLeftSide ? OkrenSide.left : OkrenSide.right;
      const okrenComponent = OkrenComponentArray.getComponent(okren);
      const hardenTimeTicks = secondsToTicks(0.62);
      if (hardenTimeTicks > okrenComponent.eyeHardenTimers[i]) {
         okrenComponent.eyeHardenTimers[i] = hardenTimeTicks;
      }

      // Make all the limbs spasm a lil' bit
      const transformComponent = TransformComponentArray.getComponent(okren);
      for (const hitbox of transformComponent.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT) || hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT) || hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
            addHitboxAngularVelocity(hitbox, -randFloat(1.1, 1.3));
         }
      }
   }
}

function getDamageTakenMultiplier(_entity: Entity, hitHitbox: Hitbox): number {
   if (hitHitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
      return 2;
   } else {
      return 1;
   }
}