import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { getAgeTicks, TransformComponentArray } from "./TransformComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { PhysicsComponentArray } from "./PhysicsComponent";

export interface ProjectileComponentParams {
   owner: EntityID;
}

const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 64;
// @Incomplete: Use width and height from generic arrow info
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

export class ProjectileComponent {
   public readonly owner: EntityID;

   constructor(params: ProjectileComponentParams) {
      this.owner = params.owner;
   }
}

export const ProjectileComponentArray = new ComponentArray<ProjectileComponent>(ServerComponentType.projectile, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_projectileComponent: ProjectileComponent, projectile: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(projectile);
   const ageTicks = getAgeTicks(transformComponent);

   if (ageTicks >= 1.5 * Settings.TPS) {
      Board.destroyEntity(projectile);
      return;
   }
   
   // 
   // Air resistance
   // 

   const physicsComponent = PhysicsComponentArray.getComponent(projectile);

   const xSignBefore = Math.sign(physicsComponent.selfVelocity.x);
   
   const velocityLength = physicsComponent.selfVelocity.length();
   physicsComponent.selfVelocity.x = (velocityLength - 3) * physicsComponent.selfVelocity.x / velocityLength;
   physicsComponent.selfVelocity.y = (velocityLength - 3) * physicsComponent.selfVelocity.y / velocityLength;
   if (Math.sign(physicsComponent.selfVelocity.x) !== xSignBefore) {
      physicsComponent.selfVelocity.x = 0;
      physicsComponent.selfVelocity.y = 0;
   }
   
   // @Hack
   // Destroy the arrow if it reaches the border
   if (transformComponent.position.x <= ARROW_DESTROY_DISTANCE || transformComponent.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || transformComponent.position.y <= ARROW_DESTROY_DISTANCE || transformComponent.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      Board.destroyEntity(projectile);
      return;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}