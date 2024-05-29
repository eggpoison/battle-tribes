import { FollowAIComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import Entity from "../Entity";
import { getDistanceFromPointToEntity, moveEntityToPosition, stopEntity, turnToPosition, willStopAtDesiredDistance } from "../ai-shared";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ComponentArray } from "./ComponentArray";

export class FollowAIComponent {
   /** ID of the followed entity */
   public followTargetID = 0;
   public followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   public interestTimer = 0;

   public readonly followChancePerSecond: number;
   public readonly followDistance: number;

   constructor(followCooldownTicks: number, followChancePerSecond: number, followDistance: number) {
      this.followCooldownTicks = followCooldownTicks;
      this.followChancePerSecond = followChancePerSecond;
      this.followDistance = followDistance;
   }
}

export const FollowAIComponentArray = new ComponentArray<ServerComponentType.followAI, FollowAIComponent>(true, {
   serialise: serialise
});

export function updateFollowAIComponent(entity: Entity, visibleEntities: ReadonlyArray<Entity>, interestDuration: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity.id);

   if (followAIComponent.followCooldownTicks > 0) {
      followAIComponent.followCooldownTicks--;
   }

   const followTarget = Board.entityRecord[followAIComponent.followTargetID];
   if (typeof followTarget === "undefined") {
      return;
   }
   
   // Make sure the follow target is still within the vision range
   if (!visibleEntities.includes(followTarget)) {
      followAIComponent.followTargetID = 0;
      followAIComponent.interestTimer = 0;
      return;
   }
   
   followAIComponent.interestTimer += Settings.I_TPS;
   if (followAIComponent.interestTimer >= interestDuration) {
      followAIComponent.followTargetID = 0;
   }
}

export function startFollowingEntity(entity: Entity, followedEntity: Entity, acceleration: number, turnSpeed: number, newFollowCooldownTicks: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity.id);
   followAIComponent.followTargetID = followedEntity.id;
   followAIComponent.followCooldownTicks = newFollowCooldownTicks;
   followAIComponent.interestTimer = 0;

   moveEntityToPosition(entity, followedEntity.position.x, followedEntity.position.y, acceleration, turnSpeed);
};

export function continueFollowingEntity(entity: Entity, followTarget: Entity, acceleration: number, turnSpeed: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity.id);
   const physicsComponent = PhysicsComponentArray.getComponent(entity.id);

   // @Incomplete: do getDistanceBetweenEntities
   // @Hack
   const distance = getDistanceFromPointToEntity(followTarget.position, entity) - 32;
   if (willStopAtDesiredDistance(physicsComponent, followAIComponent.followDistance, distance)) {
      stopEntity(physicsComponent);
      turnToPosition(entity, followTarget.position, turnSpeed);
   } else {
      moveEntityToPosition(entity, followTarget.position.x, followTarget.position.y, acceleration, turnSpeed);
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