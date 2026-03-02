import { Settings } from "battletribes-shared/settings";
import { getDistanceFromPointToEntity } from "../ai-shared";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TransformComponentArray } from "../components/TransformComponent";
import { entityExists, getEntityType } from "../world";
import { Point, randInt } from "../../../shared/src/utils";
import { AIHelperComponentArray } from "../components/AIHelperComponent";

export class FollowAI {
   public readonly minFollowCooldownTicks: number;
   public readonly maxFollowCooldownTicks: number;

   /** ID of the followed entity */
   public followTargetID = 0;
   public followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   public interestTimer = 0;
   public currentTargetIsForgettable = true;

   public readonly followChancePerSecond: number;
   public readonly followDistance: number;

   constructor(minFollowCooldownTicks: number, maxFollowCooldownTicks: number, followChancePerSecond: number, followDistance: number) {
      this.minFollowCooldownTicks = minFollowCooldownTicks;
      this.maxFollowCooldownTicks = maxFollowCooldownTicks;
      this.followCooldownTicks = randInt(minFollowCooldownTicks, maxFollowCooldownTicks);
      this.followChancePerSecond = followChancePerSecond;
      this.followDistance = followDistance;
   }
}

export function updateFollowAIComponent(followAI: FollowAI, visibleEntities: ReadonlyArray<Entity>, interestDuration: number): void {
   if (followAI.followCooldownTicks > 0) {
      followAI.followCooldownTicks--;
   }

   if (!entityExists(followAI.followTargetID)) {
      return;
   }
   
   // Make sure the follow target is still within the vision range
   if (!visibleEntities.includes(followAI.followTargetID)) {
      followAI.followTargetID = 0;
      followAI.interestTimer = 0;
      return;
   }
   
   if (followAI.currentTargetIsForgettable) {
      followAI.interestTimer += Settings.DT_S;
      if (followAI.interestTimer >= interestDuration) {
         followAI.followTargetID = 0;
      }
   }
}

export function followAISetFollowTarget(followAI: FollowAI, followedEntity: Entity, isForgettable: boolean): void {
   followAI.followTargetID = followedEntity;
   followAI.followCooldownTicks = randInt(followAI.minFollowCooldownTicks, followAI.maxFollowCooldownTicks);
   followAI.interestTimer = 0;
   followAI.currentTargetIsForgettable = isForgettable;

   // @Temporary: now that cow uses custom move func.
   //    - will want to go through all places which call this and make them handle the movement themselves
   // const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
   // const followedEntityHitbox = followedEntityTransformComponent.hitboxes[0];
   // moveEntityToPosition(entity, followedEntityHitbox.box.position.x, followedEntityHitbox.box.position.y, acceleration, turnSpeed);
};

export function continueFollowingEntity(entity: Entity, followAI: FollowAI, followTarget: Entity, acceleration: number, turnSpeed: number, turnDamping: number): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   const entityHitbox = transformComponent.hitboxes[0];
   
   const followTargetTransformComponent = TransformComponentArray.getComponent(followTarget);
   const followTargetHitbox = followTargetTransformComponent.hitboxes[0];
   
   // @Incomplete: do getDistanceBetweenEntities
   // @Hack: not right - assumes 1 circular hitbox with radius of 32
   // @Hack: This so asssss, should call a function to find the distance between entities instead
   let radius: number;
   if (getEntityType(entity) === EntityType.krumblid) { 
      radius = 12;
   } else {
      radius = 32;
   }
   const distance = getDistanceFromPointToEntity(followTargetHitbox.box.position, transformComponent) - radius;
   if (distance < followAI.followDistance) {
      // Too close, move backwards with half acceleration!

      aiHelperComponent.turnFunc(entity, followTargetHitbox.box.position, turnSpeed, turnDamping)

      const awayDirection = followTargetHitbox.box.position.angleTo(entityHitbox.box.position);
      const moveTargetX = entityHitbox.box.position.x + 500 * Math.sin(awayDirection);
      const moveTargetY = entityHitbox.box.position.y + 500 * Math.cos(awayDirection);
      aiHelperComponent.moveFunc(entity, new Point(moveTargetX, moveTargetY), acceleration * 0.5);
   } else {
      aiHelperComponent.turnFunc(entity, followTargetHitbox.box.position, turnSpeed, turnDamping);
      aiHelperComponent.moveFunc(entity, followTargetHitbox.box.position, acceleration);
   }
}

export function entityWantsToFollow(followAIComponent: FollowAI): boolean {
   return followAIComponent.followCooldownTicks === 0 && Math.random() < followAIComponent.followChancePerSecond * Settings.DT_S;
}