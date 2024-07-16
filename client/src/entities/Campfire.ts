import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Board from "../Board";
import { createEmberParticle, createSmokeParticle } from "../particles";
import Entity, { ComponentDataRecord } from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class Campfire extends Entity {
   public static readonly SIZE = 104;

   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.campfire);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, Point.unpackage(transformComponentData.position));
      }
   }

   public tick(): void {
      super.tick();

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const transformComponent = this.getServerComponent(ServerComponentType.transform);

         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         const transformComponent = this.getServerComponent(ServerComponentType.transform);
         
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(100, 140));
      }
   }
}

export default Campfire;