import { ServerComponentType } from "battletribes-shared/components";
import Entity from "../Entity";
import ColouredRenderPart, { RenderPartColour } from "../render-parts/ColouredRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import ServerComponent from "./ServerComponent";
import { Colour, hueShift, lerp, multiColourLerp } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import Board from "../Board";
import { PacketReader } from "battletribes-shared/packets";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { Hitbox } from "battletribes-shared/boxes/boxes";

const enum Vars {
   NATURAL_DRIFT = 20 / Settings.TPS
}

const MAX_BEND = 6;

const REED_COLOURS: ReadonlyArray<Colour> = [
   {
      r: 219/255,
      g: 215/255,
      b: 197/255,
      a: 1
   },
   {
      r: 68/255,
      g: 181/255,
      b: 49/255,
      a: 1
   },
   {
      r: 97/255,
      g: 214/255,
      b: 77/255,
      a: 1
   },
   {
      r: 203/255,
      g: 255/255,
      b: 194/255,
      a: 1
   }
];

const bendToPushAmount = (bend: number): number => {
   return bend - 1 / (bend - MAX_BEND) - 1 / MAX_BEND;
}

const pushAmountToBend = (pushAmount: number): number => {
   let bend = pushAmount + 1 / MAX_BEND - MAX_BEND - Math.sqrt(Math.pow(pushAmount + 1 / MAX_BEND - MAX_BEND, 2) + 4);
   bend /= 2;
   bend += MAX_BEND;
   return bend;
}

const getLayerColour = (entity: Entity, r: number, g: number, b: number, layer: number, numLayers: number): RenderPartColour => {
   switch (entity.type as EntityType.grassStrand | EntityType.reed) {
      case EntityType.grassStrand: {
         // @Speed: a lot of this is shared for all strands
         
         const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   
         const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
         const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   
         const grassInfo = Board.grassInfo[tileX][tileY];
   
         let humidity = grassInfo.humidity;
         if (grassInfo.temperature <= 0.5) {
            humidity = lerp(humidity, 0, 1 - grassInfo.temperature * 2);
         }

         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((numLayers - 1), 1);

         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.915);

         const colour: RenderPartColour = {
            r: r * brightnessMultiplier,
            g: g * brightnessMultiplier,
            b: b * brightnessMultiplier,
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
         return colour;
      }
      case EntityType.reed: {
         const height = (layer - 1) / Math.max((numLayers - 1), 1);
         return multiColourLerp(REED_COLOURS, height);
      }
   }
}

class LayeredRodComponent extends ServerComponent {
   public readonly renderParts = new Array<RenderPart>();

   public readonly numLayers: number;
   
   public readonly naturalBendX: number;
   public readonly naturalBendY: number;
   
   public bendX = 0;
   public bendY = 0;

   private readonly r: number;
   private readonly g: number;
   private readonly b: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.numLayers = reader.readNumber();
      this.naturalBendX = reader.readNumber();
      this.naturalBendY = reader.readNumber();

      // @Temporary
      this.r = reader.readNumber();
      this.g = reader.readNumber();
      this.b = reader.readNumber();
   }

   public onLoad(): void {
      const bendX = this.naturalBendX;
      const bendY = this.naturalBendY;
      
      // Create layers
      for (let layer = 1; layer <= this.numLayers; layer++) {
         const colour = getLayerColour(this.entity, this.r, this.g, this.b, layer, this.numLayers);

         const zIndex = layer / 10;
         const renderPart = new ColouredRenderPart(
            null,
            zIndex,
            0,
            colour
         );

         renderPart.offset.x = bendX * layer;
         renderPart.offset.y = bendY * layer;

         this.renderParts.push(renderPart);
         this.entity.attachRenderThing(renderPart);
      }
   }

   public onCollision(collidingEntity: Entity, _pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
      if (collidingEntity.type === EntityType.tree) {
         return;
      }
      
      LayeredRodComponentArray.activateComponent(this, this.entity.id);
      
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
   
      // const distance = transformComponent.position.calculateDistanceBetween(pushingHitbox.position);
      const directionFromCollidingEntity = pushingHitbox.box.position.calculateAngleBetween(transformComponent.position);
   
      let existingPushX = bendToPushAmount(this.bendX);
      let existingPushY = bendToPushAmount(this.bendY);
      
      // let pushAmount = 1200 / Settings.TPS / (distance + 0.5) / Math.sqrt(this.numLayers);
      let pushAmount = 250 * pushingHitbox.mass / Settings.TPS / Math.sqrt(this.numLayers);
      
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
      
      updateOffsets(this);
      this.entity.dirty();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
   }
}

export default LayeredRodComponent;

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ComponentArrayType.server, ServerComponentType.layeredRod, false, {
   onTick: onTick
});

const updateOffsets = (layeredRodComponent: LayeredRodComponent): void => {
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
   const bendProgress = bendMagnitude / MAX_BEND;
   const naturalBendMultiplier = 1 - bendProgress;
   
   const bendX = layeredRodComponent.naturalBendX * naturalBendMultiplier + layeredRodComponent.bendX;
   const bendY = layeredRodComponent.naturalBendY * naturalBendMultiplier + layeredRodComponent.bendY;
   
   for (let layer = 1; layer <= layeredRodComponent.numLayers; layer++) {
      const renderPart = layeredRodComponent.renderParts[layer - 1];

      renderPart.offset.x = bendX * layer;
      renderPart.offset.y = bendY * layer;
   }
}

function onTick(layeredRodComponent: LayeredRodComponent, entity: EntityID): void {
   if (layeredRodComponent.bendX === 0 && layeredRodComponent.bendY === 0) {
      LayeredRodComponentArray.queueComponentDeactivate(entity);
      return;
   }
   
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);

   // Slow the return the closer to straight it is
   let bendSmoothnessMultiplier = 1 - bendMagnitude / MAX_BEND;
   bendSmoothnessMultiplier *= bendSmoothnessMultiplier * bendSmoothnessMultiplier;
   bendSmoothnessMultiplier = 1 - bendSmoothnessMultiplier;
   // Make sure it doesn't completely stop movement
   bendSmoothnessMultiplier = bendSmoothnessMultiplier * 0.9 + 0.1;
   
   layeredRodComponent.bendX -= Vars.NATURAL_DRIFT * bendSmoothnessMultiplier * layeredRodComponent.bendX / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);
   layeredRodComponent.bendY -= Vars.NATURAL_DRIFT * bendSmoothnessMultiplier * layeredRodComponent.bendY / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);

   updateOffsets(layeredRodComponent);
   layeredRodComponent.entity.dirty();
}