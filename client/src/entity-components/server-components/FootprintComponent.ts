import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import { playSound } from "../../sound";
import Board from "../../Board";
import { createFootprintParticle } from "../../particles";
import { ClientComponentType } from "../components";
import { getEntityLayer } from "../../world";
import { entityIsInRiver, getEntityTile, TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import { PhysicsComponentArray } from "./PhysicsComponent";
import ClientComponentArray from "../ClientComponentArray";

export class FootprintComponent {
   public readonly footstepParticleIntervalSeconds: number;
   public readonly footstepOffset: number;
   public readonly footstepSize: number;
   public readonly footstepLifetime: number;
   public readonly footstepSoundIntervalDist: number;
   
   public numFootstepsTaken = 0;
   public distanceTracker = 0;

   constructor(footstepParticleIntervalSeconds: number, footstepOffset: number, footstepSize: number, footstepLifetime: number, footstepSoundIntervalDist: number) {
      this.footstepParticleIntervalSeconds = footstepParticleIntervalSeconds;
      this.footstepOffset = footstepOffset;
      this.footstepSize = footstepSize;
      this.footstepLifetime = footstepLifetime;
      this.footstepSoundIntervalDist = footstepSoundIntervalDist;
   }
}

export default FootprintComponent;

export const FootprintComponentArray = new ClientComponentArray<FootprintComponent>(ClientComponentType.footprint, true, {
   onTick: onTick
});

const createFootstepSound = (entity: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   const tile = getEntityTile(layer, transformComponent);
   switch (tile.type) {
      case TileType.grass: {
         playSound("grass-walk-" + randInt(1, 4) + ".mp3", 0.04, 1, transformComponent.position);
         break;
      }
      case TileType.sand: {
         playSound("sand-walk-" + randInt(1, 4) + ".mp3", 0.02, 1, transformComponent.position);
         break;
      }
      case TileType.snow: {
         playSound("snow-walk-" + randInt(1, 3) + ".mp3", 0.1, 1, transformComponent.position);
         break;
      }
      case TileType.rock: {
         playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, transformComponent.position);
         break;
      }
      case TileType.water: {
         if (!entityIsInRiver(transformComponent, entity)) {
            playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, transformComponent.position);
         }
         break;
      }
   }
}

function onTick(footprintComponent: FootprintComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   // Footsteps
   if (physicsComponent.selfVelocity.lengthSquared() >= 2500 && !entityIsInRiver(transformComponent, entity) && Board.tickIntervalHasPassed(footprintComponent.footstepParticleIntervalSeconds)) {
      createFootprintParticle(entity, footprintComponent.numFootstepsTaken, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
      footprintComponent.numFootstepsTaken++;
   }
   footprintComponent.distanceTracker += physicsComponent.selfVelocity.length() / Settings.TPS;
   if (footprintComponent.distanceTracker > footprintComponent.footstepSoundIntervalDist) {
      footprintComponent.distanceTracker -= footprintComponent.footstepSoundIntervalDist;
      createFootstepSound(entity);
   }
}