import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Settings } from "battletribes-shared/settings";
import { destroyEntity, getEntityAgeTicks } from "../world";

export interface ProjectileComponentParams {
   owner: EntityID;
}

const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 64;
// @Incomplete: Use width and height from generic arrow info
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

/** Add to projectiles to make them not damage their owner and be able to be blocked. */
export class ProjectileComponent {
   public readonly owner: EntityID;
   public isBlocked = false;

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
   const ageTicks = getEntityAgeTicks(projectile);
   if (ageTicks >= 1.5 * Settings.TPS) {
      destroyEntity(projectile);
      return;
   }
   
   // @Hack
   // Destroy the arrow if it reaches the border
   const transformComponent = TransformComponentArray.getComponent(projectile);
   if (transformComponent.position.x <= ARROW_DESTROY_DISTANCE || transformComponent.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || transformComponent.position.y <= ARROW_DESTROY_DISTANCE || transformComponent.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      destroyEntity(projectile);
      return;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}