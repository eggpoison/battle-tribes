import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { createFlyParticle } from "../particles";
import Entity from "../Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import HealthComponent from "../entity-components/HealthComponent";
import SpikesComponent from "../entity-components/SpikesComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";

class PunjiSticks extends Entity {
   private ticksSinceLastFly = 0;
   private ticksSinceLastFlySound = 0;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.floorPunjiSticks>) {
      const spikesComponentData = componentsData[3];
      const entityType = spikesComponentData.attachedWallID !== 0 ? EntityType.wallPunjiSticks : EntityType.floorPunjiSticks;
      
      super(position, id, entityType, ageTicks);

      let textureArrayIndex: number;
      if (spikesComponentData.attachedWallID !== 0) {
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

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.spikes, new SpikesComponent(this, spikesComponentData, renderPart));

      if (ageTicks <= 1) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   // @Hack
   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      super.addRectangularHitbox(hitbox);
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