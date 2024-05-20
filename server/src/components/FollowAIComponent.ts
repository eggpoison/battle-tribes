import { FollowAIComponentData } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import Entity from "../Entity";
import { moveEntityToPosition } from "../ai-shared";
import { FollowAIComponentArray } from "./ComponentArray";

export class FollowAIComponent {
   /** ID of the followed entity */
   public followTargetID = 0;
   public followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   public interestTimer = 0;

   constructor(followCooldownTicks: number) {
      this.followCooldownTicks = followCooldownTicks;
   }
}

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

export function followEntity(entity: Entity, followedEntity: Entity, acceleration: number, turnSpeed: number, newFollowCooldownTicks: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity.id);
   followAIComponent.followTargetID = followedEntity.id;
   followAIComponent.followCooldownTicks = newFollowCooldownTicks;
   followAIComponent.interestTimer = 0;
   moveEntityToPosition(entity, followedEntity.position.x, followedEntity.position.y, acceleration, turnSpeed);
};

export function canFollow(followAIComponent: FollowAIComponent): boolean {
   return followAIComponent.followCooldownTicks === 0;
}

export function serialiseFollowAIComponent(entity: Entity): FollowAIComponentData {
   const followAIComponent = FollowAIComponentArray.getComponent(entity.id);
   return {
      followTargetID: followAIComponent.followTargetID,
      followCooldownTicks: followAIComponent.followCooldownTicks,
      interestTimer: followAIComponent.interestTimer
   };
}