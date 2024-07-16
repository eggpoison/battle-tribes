import { FollowAIComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { getDistanceFromPointToEntity, moveEntityToPosition, stopEntity, turnToPosition, willStopAtDesiredDistance } from "../ai-shared";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";

export interface FollowAIComponentParams {
   readonly followCooldownTicks: number;
   readonly followChancePerSecond: number;
   readonly followDistance: number;
}

export class FollowAIComponent {
   /** ID of the followed entity */
   public followTargetID = 0;
   public followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   public interestTimer = 0;

   public readonly followChancePerSecond: number;
   public readonly followDistance: number;

   constructor(params: FollowAIComponentParams) {
      this.followCooldownTicks = params.followCooldownTicks;
      this.followChancePerSecond = params.followChancePerSecond;
      this.followDistance = params.followDistance;
   }
}

export const FollowAIComponentArray = new ComponentArray<FollowAIComponent>(ServerComponentType.followAI, true, {
   serialise: serialise
});

export function updateFollowAIComponent(entity: EntityID, visibleEntities: ReadonlyArray<EntityID>, interestDuration: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);

   if (followAIComponent.followCooldownTicks > 0) {
      followAIComponent.followCooldownTicks--;
   }

   if (!Board.hasEntity(followAIComponent.followTargetID)) {
      return;
   }
   
   // Make sure the follow target is still within the vision range
   if (!visibleEntities.includes(followAIComponent.followTargetID)) {
      followAIComponent.followTargetID = 0;
      followAIComponent.interestTimer = 0;
      return;
   }
   
   followAIComponent.interestTimer += Settings.I_TPS;
   if (followAIComponent.interestTimer >= interestDuration) {
      followAIComponent.followTargetID = 0;
   }
}

export function startFollowingEntity(entity: EntityID, followedEntity: EntityID, acceleration: number, turnSpeed: number, newFollowCooldownTicks: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);
   followAIComponent.followTargetID = followedEntity;
   followAIComponent.followCooldownTicks = newFollowCooldownTicks;
   followAIComponent.interestTimer = 0;

   const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
   moveEntityToPosition(entity, followedEntityTransformComponent.position.x, followedEntityTransformComponent.position.y, acceleration, turnSpeed);
};

export function continueFollowingEntity(entity: EntityID, followTarget: EntityID, acceleration: number, turnSpeed: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const followTargetTransformComponent = TransformComponentArray.getComponent(followTarget);
   
   // @Incomplete: do getDistanceBetweenEntities
   // @Hack
   const distance = getDistanceFromPointToEntity(followTargetTransformComponent.position, entity) - 32;
   if (willStopAtDesiredDistance(physicsComponent, followAIComponent.followDistance, distance)) {
      stopEntity(physicsComponent);
      turnToPosition(entity, followTargetTransformComponent.position, turnSpeed);
   } else {
      moveEntityToPosition(entity, followTargetTransformComponent.position.x, followTargetTransformComponent.position.y, acceleration, turnSpeed);
   }
}

export function entityWantsToFollow(followAIComponent: FollowAIComponent): boolean {
   return followAIComponent.followCooldownTicks === 0 && Math.random() < followAIComponent.followChancePerSecond / Settings.TPS;
}

function serialise(entityID: number): FollowAIComponentData {
   const followAIComponent = FollowAIComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.followAI,
      followTargetID: followAIComponent.followTargetID,
      followCooldownTicks: followAIComponent.followCooldownTicks,
      interestTimer: followAIComponent.interestTimer
   };
}