import { ProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";
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
   serialise: serialise
});

const tickProjectileComponent = (projectile: EntityID, projectileComponent: ProjectileComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(projectile);

   if (transformComponent.ageTicks >= 1.5 * Settings.TPS) {
      Board.destroyEntity(projectile);
      return;
   }
   
   // 
   // Air resistance
   // 

   const physicsComponent = PhysicsComponentArray.getComponent(projectile);

   const xSignBefore = Math.sign(physicsComponent.velocity.x);
   
   const velocityLength = physicsComponent.velocity.length();
   physicsComponent.velocity.x = (velocityLength - 3) * physicsComponent.velocity.x / velocityLength;
   physicsComponent.velocity.y = (velocityLength - 3) * physicsComponent.velocity.y / velocityLength;
   if (Math.sign(physicsComponent.velocity.x) !== xSignBefore) {
      physicsComponent.velocity.x = 0;
      physicsComponent.velocity.y = 0;
   }
   
   // @Hack
   // Destroy the arrow if it reaches the border
   if (transformComponent.position.x <= ARROW_DESTROY_DISTANCE || transformComponent.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || transformComponent.position.y <= ARROW_DESTROY_DISTANCE || transformComponent.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      Board.destroyEntity(projectile);
      return;
   }
}

export function tickProjectileComponents(): void {
   for (let i = 0; i < ProjectileComponentArray.components.length; i++) {
      const entity = ProjectileComponentArray.getEntityFromArrayIdx(i);
      const projectileComponent = ProjectileComponentArray.components[i];

      tickProjectileComponent(entity, projectileComponent);
   }
}

function serialise(entity: EntityID): ProjectileComponentData {
   return {
      componentType: ServerComponentType.projectile
   };
}