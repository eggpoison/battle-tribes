import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { createFlyParticle } from "../particles";
import Entity from "../Entity";

class PunjiSticks extends Entity {
   private ticksSinceLastFly = 0;
   private ticksSinceLastFlySound = 0;

   constructor(position: Point, id: number, ageTicks: number, entityType: EntityType) {
      super(position, id, entityType, ageTicks);

      const isAttachedToWall = entityType === EntityType.wallPunjiSticks;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
      } else {
         textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
      }

      const renderPart = new RenderPart(
         this,
         textureArrayIndex,
         0,
         0
      )
      this.attachRenderPart(renderPart);

      if (ageTicks <= 1) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   public tick(): void {
      super.tick();

      this.ticksSinceLastFly++;
      const flyChance = ((this.ticksSinceLastFly / Settings.TPS) - 0.25) * 0.2;
      if (Math.random() / Settings.TPS < flyChance) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createFlyParticle(x, y);
         this.ticksSinceLastFly = 0;
      }

      this.ticksSinceLastFlySound++;
      const soundChance = ((this.ticksSinceLastFlySound / Settings.TPS) - 0.3) * 2;
      if (Math.random() < soundChance / Settings.TPS) {
         playSound("flies.mp3", 0.15, randFloat(0.9, 1.1), this.position.x, this.position.y);
         this.ticksSinceLastFlySound = 0;
      }
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default PunjiSticks;