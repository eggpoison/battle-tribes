import { LayeredRodComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ColouredRenderPart, { RenderPartColour } from "../render-parts/ColouredRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import ServerComponent from "./ServerComponent";
import { lerp } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { hueShift } from "../colour";
import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

const enum Vars {
   // NATURAL_DRIFT = 0.6 / Settings.TPS
   NATURAL_DRIFT = 30 / Settings.TPS
}

const MAX_BEND = 6;

const bendToPushAmount = (bend: number): number => {
   return bend - 1 / (bend - MAX_BEND) - 1 / MAX_BEND;
}

const pushAmountToBend = (pushAmount: number): number => {
   let bend = pushAmount + 1 / MAX_BEND - MAX_BEND - Math.sqrt(Math.pow(pushAmount + 1 / MAX_BEND - MAX_BEND, 2) + 4);
   bend /= 2;
   bend += MAX_BEND;
   return bend;
}

class LayeredRodComponent extends ServerComponent {
   private readonly renderParts = new Array<RenderPart>();

   private readonly numLayers: number;
   
   private readonly naturalBendX: number;
   private readonly naturalBendY: number;
   
   private bendX = 0;
   private bendY = 0;
   
   constructor(entity: Entity, data: LayeredRodComponentData) {
      super(entity);

      this.numLayers = data.numLayers;
      this.naturalBendX = data.bend[0];
      this.naturalBendY = data.bend[1];
      
      const transformComponent = entity.getServerComponent(ServerComponentType.transform);

      const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);

      const grassInfo = Board.grassInfo[tileX][tileY];

      let humidity = grassInfo.humidity;
      if (grassInfo.temperature <= 0.5) {
         humidity = lerp(humidity, 0, 1 - grassInfo.temperature * 2);
      }
      
      const bendX = data.bend[0];
      const bendY = data.bend[1];
      
      // Create layers
      for (let layer = 1; layer <= data.numLayers; layer++) {
         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((data.numLayers - 1), 1);

         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.88);
         
         const colour: RenderPartColour = {
            r: data.colour.r * brightnessMultiplier,
            g: data.colour.g * brightnessMultiplier,
            b: data.colour.b * brightnessMultiplier,
            a: 1
         };

         if (grassInfo.temperature > 0) {
            const humidityMultiplier = (humidity - 0.5) * -0.7;
            if (humidityMultiplier > 0) {
               colour.r = lerp(colour.r, 1, humidityMultiplier * 0.7);
               colour.b = lerp(colour.b, 1, humidityMultiplier * 0.7);
            } else {
               colour.r = lerp(colour.r, 0, -humidityMultiplier);
               colour.b = lerp(colour.b, 0, -humidityMultiplier);
            }
   
            const hueAdjust = (grassInfo.temperature - 0.5) * 0.8;
            hueShift(colour, hueAdjust);
         }
         
         const zIndex = layer / 10;
         const renderPart = new ColouredRenderPart(
            entity,
            zIndex,
            0,
            colour
         );

         renderPart.offset.x = bendX * layer;
         renderPart.offset.y = bendY * layer;

         this.renderParts.push(renderPart);
         this.entity.attachRenderPart(renderPart);
      }
   }

   private updateOffsets(): void {
      const bendX = this.naturalBendX + this.bendX;
      const bendY = this.naturalBendY + this.bendY;
      
      for (let layer = 1; layer <= this.numLayers; layer++) {
         const renderPart = this.renderParts[layer - 1];

         renderPart.offset.x = bendX * layer;
         renderPart.offset.y = bendY * layer;
      }
   }

   public tick(): void {
      if (this.bendX === 0 && this.bendY === 0) {
         return;
      }
      
      const bendMagnitude = Math.sqrt(this.bendX * this.bendX + this.bendY * this.bendY);
   
      if (bendMagnitude > Vars.NATURAL_DRIFT) {
         this.bendX -= Vars.NATURAL_DRIFT * this.bendX / bendMagnitude;
         this.bendY -= Vars.NATURAL_DRIFT * this.bendY / bendMagnitude;
      } else {
         this.bendX = 0;
         this.bendY = 0;
      }

      this.updateOffsets();
      this.entity.dirty();
   }

   public onCollision(_collidingEntity: Entity, _pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
   
      const distance = transformComponent.position.calculateDistanceBetween(pushingHitbox.position);
      const directionFromCollidingEntity = pushingHitbox.position.calculateAngleBetween(transformComponent.position);
   
      let existingPushX = bendToPushAmount(this.bendX);
      let existingPushY = bendToPushAmount(this.bendY);
      
      // let pushAmount = 400 / Settings.TPS / (distance + 0.5);
      let pushAmount = 1000 / Settings.TPS / (distance + 0.5);
      pushAmount *= pushingHitbox.mass;
      
      // Restrict the bend from going past the max bend
      const currentBend = Math.sqrt(this.bendX * this.bendX + this.bendY * this.bendY);
      pushAmount *= Math.pow((MAX_BEND - currentBend) / MAX_BEND, 0.5);
   
      existingPushX += pushAmount * Math.sin(directionFromCollidingEntity);
      existingPushY += pushAmount * Math.cos(directionFromCollidingEntity);
   
      const bendX = pushAmountToBend(existingPushX);
      const bendY = pushAmountToBend(existingPushY);
   
      // @Hack
      if (Math.sqrt(bendX * bendX + bendY * bendY) >= MAX_BEND) {
         return;
      }
   
      this.bendX = bendX;
      this.bendY = bendY;
      
      this.updateOffsets();
      this.entity.dirty();
   }

   public updateFromData(data: LayeredRodComponentData): void {}
}

export default LayeredRodComponent;