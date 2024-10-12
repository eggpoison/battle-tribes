import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { createDirtParticle } from "../particles";
import { playSound } from "../sound";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { CowSpecies, EntityID } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { getEntityLayer } from "../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";

class CowComponent extends ServerComponent {
   public species = CowSpecies.black;
   public grazeProgress = 0;

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.species = reader.readNumber();
      const grazeProgress = reader.readNumber();
      
      // When the cow has finished grazing, create a bunch of dirt particles
      if (grazeProgress < this.grazeProgress) {
         const transformComponent = TransformComponentArray.getComponent(this.entity.id);
         const layer = getEntityLayer(transformComponent.entity.id);
         
         const tile = getEntityTile(layer, transformComponent);
         for (let i = 0; i < 15; i++) {
            const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (tile.y + Math.random()) * Settings.TILE_SIZE;
            createDirtParticle(x, y, ParticleRenderLayer.low);
         }
      }
      this.grazeProgress = grazeProgress;
   }
}

export default CowComponent;

export const CowComponentArray = new ComponentArray<CowComponent>(ComponentArrayType.server, ServerComponentType.cow, true, {
   onTick: onTick
});

function onTick(cowComponent: CowComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   if (cowComponent.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
      const spawnOffsetMagnitude = 30 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createDirtParticle(spawnPositionX, spawnPositionY, ParticleRenderLayer.low);
   }

   if (Math.random() < 0.1 / Settings.TPS) {
      playSound("cow-ambient-" + randInt(1, 3) + ".mp3", 0.2, 1, transformComponent.position);
   }
}