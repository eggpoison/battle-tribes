import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { lerp, randFloat } from "battletribes-shared/utils";
import { RenderPart } from "../render-parts/render-parts";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { createSnowParticle, createWhiteSmokeParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

const enum Vars {
   SNOW_THROW_OFFSET = 64
}

export const YETI_SIZE = 128;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

class YetiComponent extends ServerComponent {
   public pawRenderParts: ReadonlyArray<RenderPart>;
   
   public lastAttackProgress: number;
   public attackProgress: number;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.lastAttackProgress = reader.readNumber();
      this.attackProgress = this.lastAttackProgress;

      this.pawRenderParts = this.entity.getRenderThings("yetiComponent:paw", 2) as Array<RenderPart>;
      this.updatePaws();
   }
   
   private updatePaws(): void {
      let attackProgress = this.attackProgress;
      attackProgress = Math.pow(attackProgress, 0.75);
      
      for (let i = 0; i < 2; i++) {
         const paw = this.pawRenderParts[i];

         const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
         paw.offset.x = YETI_SIZE/2 * Math.sin(angle);
         paw.offset.y = YETI_SIZE/2 * Math.cos(angle);
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   public updateFromData(reader: PacketReader): void {
      this.attackProgress = reader.readNumber();
      this.updatePaws();
   }
}

export default YetiComponent;

export const YetiComponentArray = new ComponentArray<YetiComponent>(ComponentArrayType.server, ServerComponentType.yeti, true, {
   onTick: onTick
});

function onTick(yetiComponent: YetiComponent): void {
   const transformComponent = yetiComponent.entity.getServerComponent(ServerComponentType.transform);

   // Create snow impact particles when the Yeti does a throw attack
   if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
      const offsetMagnitude = Vars.SNOW_THROW_OFFSET + 20;
      const impactPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
      const impactPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
      
      for (let i = 0; i < 30; i++) {
         const offsetMagnitude = randFloat(0, 20);
         const offsetDirection = 2 * Math.PI * Math.random();
         const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
         const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
         
         createSnowParticle(positionX, positionY, randFloat(40, 100));
      }

      // White smoke particles
      for (let i = 0; i < 10; i++) {
         const spawnPositionX = impactPositionX;
         const spawnPositionY = impactPositionY;
         createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
      }
   }
   yetiComponent.lastAttackProgress = yetiComponent.attackProgress;
}