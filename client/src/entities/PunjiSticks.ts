import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { createFlyParticle } from "../particles";
import Entity, { ComponentDataRecord } from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class PunjiSticks extends Entity {
   private ticksSinceLastFly = 0;
   private ticksSinceLastFlySound = 0;

   constructor(id: number, entityType: EntityType, componentDataRecord: ComponentDataRecord) {
      super(id, entityType);

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

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("spike-place.mp3", 0.5, 1, Point.unpackage(transformComponentData.position));
      }
   }

   public tick(): void {
      super.tick();

      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      this.ticksSinceLastFly++;
      const flyChance = ((this.ticksSinceLastFly / Settings.TPS) - 0.25) * 0.2;
      if (Math.random() / Settings.TPS < flyChance) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createFlyParticle(x, y);
         this.ticksSinceLastFly = 0;
      }

      this.ticksSinceLastFlySound++;
      const soundChance = ((this.ticksSinceLastFlySound / Settings.TPS) - 0.3) * 2;
      if (Math.random() < soundChance / Settings.TPS) {
         playSound("flies.mp3", 0.15, randFloat(0.9, 1.1), transformComponent.position);
         this.ticksSinceLastFlySound = 0;
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-hit.mp3", 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default PunjiSticks;