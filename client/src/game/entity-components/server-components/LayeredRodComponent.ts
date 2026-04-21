import { TileType, Entity, EntityType, PacketReader, Colour, getTileIndexIncludingEdges, lerp, Settings, ServerComponentType } from "webgl-test-shared";
import ColouredRenderPart from "../../render-parts/ColouredRenderPart";
import { EntityComponentData, getEntityRenderObject, getEntityType, surfaceLayer } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { registerDirtyRenderObject } from "../../rendering/render-part-matrices";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { hueShift, multiColourLerp } from "../../render-parts/VisualRenderPart";
import { registerServerComponentArray } from "../component-register";

const enum Var {
   SPRING_BACK_RATE = 8 * Settings.DT_S
}

export interface LayeredRodComponentData {
   readonly numLayers: number;
   readonly naturalBendX: number;
   readonly naturalBendY: number;
   readonly r: number;
   readonly g: number;
   readonly b: number;
}

export interface LayeredRodComponent {
   readonly numLayers: number;
   
   readonly naturalBendX: number;
   readonly naturalBendY: number;
   
   bendX: number;
   bendY: number;
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

const setLayerColour = (renderPart: ColouredRenderPart, entityComponentData: EntityComponentData, r: number, g: number, b: number, layer: number, numLayers: number): void => {
   switch (entityComponentData.entityType as EntityType.grassStrand | EntityType.reed) {
      case EntityType.grassStrand: {
         // @Speed: a lot of this is shared for all strands
         
         const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
         const hitbox = transformComponentData.hitboxes[0];
   
         const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
         const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = surfaceLayer.getTile(tileIndex).type;
   
         const grassInfo = surfaceLayer.grassInfo[tileX]![tileY]!;

         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((numLayers - 1), 1);
         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.915);

         // Desert grass has slightly more consistent colours
         if (tileType === TileType.sandyDirt) {
            brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.5);
         }

         renderPart.tintR = r * brightnessMultiplier;
         renderPart.tintG = g * brightnessMultiplier;
         renderPart.tintB = b * brightnessMultiplier;
         // @Hack: the temperature check seems pointless
         if (grassInfo.temperature > 0 && tileType === TileType.grass) {
            let humidity = grassInfo.humidity;
            if (grassInfo.temperature <= 0.5) {
               humidity = lerp(humidity, 0, 1 - grassInfo.temperature * 2);
            }

            const humidityMultiplier = (humidity - 0.5) * -0.7;
            if (humidityMultiplier > 0) {
               renderPart.tintR = lerp(renderPart.tintR, 1, humidityMultiplier * 0.7);
               renderPart.tintB = lerp(renderPart.tintB, 1, humidityMultiplier * 0.7);
            } else {
               renderPart.tintR = lerp(renderPart.tintR, 0, -humidityMultiplier);
               renderPart.tintB = lerp(renderPart.tintB, 0, -humidityMultiplier);
            }
   
            const hueAdjust = (grassInfo.temperature - 0.5) * 0.8;
            hueShift(renderPart, hueAdjust);
         }

         break;
      }
      case EntityType.reed: {
         const height = (layer - 1) / Math.max((numLayers - 1), 1);
         multiColourLerp(renderPart, REED_COLOURS, height);
         break;
      }
   }
}

class _LayeredRodComponentArray extends ServerComponentArray<LayeredRodComponent, LayeredRodComponentData> {
   public decodeData(reader: PacketReader): LayeredRodComponentData {
      const numLayers = reader.readNumber();
      const naturalBendX = reader.readNumber();
      const naturalBendY = reader.readNumber();

      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();

      return {
         numLayers: numLayers,
         naturalBendX: naturalBendX,
         naturalBendY: naturalBendY,
         r: r,
         g: g,
         b: b
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const layeredRodComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.layeredRod);

      const naturalBendX = layeredRodComponentData.naturalBendX;
      const naturalBendY = layeredRodComponentData.naturalBendY;
      
      // Create layers
      for (let layer = 1; layer <= layeredRodComponentData.numLayers; layer++) {
         const zIndex = layer / 10;
         const renderPart = new ColouredRenderPart(
            hitbox,
            zIndex,
            0,
            naturalBendX * layer, naturalBendY * layer
         );

         setLayerColour(renderPart, entityComponentData, layeredRodComponentData.r, layeredRodComponentData.g, layeredRodComponentData.b, layer, layeredRodComponentData.numLayers);

         renderObject.attachRenderPart(renderPart);
      }
   }

   public createComponent(entityComponentData: EntityComponentData): LayeredRodComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const layeredRodComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.layeredRod);

      const naturalBendX = layeredRodComponentData.naturalBendX;
      const naturalBendY = layeredRodComponentData.naturalBendY;

      return {
         numLayers: layeredRodComponentData.numLayers,
         naturalBendX: naturalBendX,
         naturalBendY: naturalBendY,
         bendX: naturalBendX,
         bendY: naturalBendY
      };
   }

   public getMaxRenderParts(entityComponentData: EntityComponentData): number {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const layeredRodComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.layeredRod);
      return layeredRodComponentData.numLayers;
   }

   public onTick(entity: Entity): void {
      const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
      
      const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);

      // Slow the return the closer to straight it is
      let bendSmoothnessMultiplier = 1 - bendMagnitude / MAX_BEND;
      bendSmoothnessMultiplier *= bendSmoothnessMultiplier * bendSmoothnessMultiplier;
      bendSmoothnessMultiplier = 1 - bendSmoothnessMultiplier;
      // Make sure it doesn't completely stop movement
      bendSmoothnessMultiplier = bendSmoothnessMultiplier * 0.9 + 0.1;
      
      layeredRodComponent.bendX -= Var.SPRING_BACK_RATE * bendSmoothnessMultiplier * layeredRodComponent.bendX / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);
      layeredRodComponent.bendY -= Var.SPRING_BACK_RATE * bendSmoothnessMultiplier * layeredRodComponent.bendY / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);

      updateOffsets(layeredRodComponent, entity);

      if (layeredRodComponent.bendX === 0 && layeredRodComponent.bendY === 0) {
         LayeredRodComponentArray.queueComponentDeactivate(entity);
      }

      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(entity, renderObject);
   }

   public onCollision(entity: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox): void {
      // @Hack!!
      if (getEntityType(collidingEntity) === EntityType.tree) {
         return;
      }
      
      const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
      LayeredRodComponentArray.activateComponent(layeredRodComponent, entity);
      
      const directionFromCollidingEntity = collidingHitbox.box.position.angleTo(affectedHitbox.box.position);

      let existingPushX = bendToPushAmount(layeredRodComponent.bendX);
      let existingPushY = bendToPushAmount(layeredRodComponent.bendY);
      
      let pushAmount = 50 * collidingHitbox.mass * Settings.DT_S / Math.sqrt(layeredRodComponent.numLayers);
      
      // Restrict the bend from going past the max bend
      const currentBend = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
      pushAmount *= Math.pow((MAX_BEND - currentBend) / MAX_BEND, 0.5);

      existingPushX += pushAmount * Math.sin(directionFromCollidingEntity);
      existingPushY += pushAmount * Math.cos(directionFromCollidingEntity);

      const bendX = pushAmountToBend(existingPushX);
      const bendY = pushAmountToBend(existingPushY);

      // @Hack
      if (Math.sqrt(bendX * bendX + bendY * bendY) >= MAX_BEND) {
         return;
      }

      layeredRodComponent.bendX = bendX;
      layeredRodComponent.bendY = bendY;
      
      updateOffsets(layeredRodComponent, entity);

      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(entity, renderObject);
   }
}

export const LayeredRodComponentArray = registerServerComponentArray(ServerComponentType.layeredRod, _LayeredRodComponentArray, false);

const updateOffsets = (layeredRodComponent: LayeredRodComponent, entity: Entity): void => {
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
   const bendProgress = bendMagnitude / MAX_BEND;
   const naturalBendMultiplier = 1 - bendProgress;
   
   const bendX = layeredRodComponent.naturalBendX * naturalBendMultiplier + layeredRodComponent.bendX;
   const bendY = layeredRodComponent.naturalBendY * naturalBendMultiplier + layeredRodComponent.bendY;
   
   const renderObject = getEntityRenderObject(entity);
   // Start at layer=2 as to not bend the base of the strand at all.
   // @Correctness: is this ok? would it look better if the base bended too? the only problem is that the chunked rendering system doesn't support that.
   for (let i = 1; i <= layeredRodComponent.numLayers - 1; i++) {
      const renderPart = renderObject.renderPartsByZIndex[i];
      renderPart.offsetX = bendX * i;
      renderPart.offsetY = bendY * i;
   }
}