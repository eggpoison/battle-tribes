import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponent from "../ServerComponent";
import { StructureComponentArray } from "./StructureComponent";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityID } from "../../../../shared/src/entities";
import { RenderPart } from "../../render-parts/render-parts";

type RailBit = 0b0001 | 0b0010 | 0b0100 | 0b1000;

const getRailIdx = (railBit: RailBit): number => {
   switch (railBit) {
      case 0b0001: return 0;
      case 0b0010: return 1;
      case 0b0100: return 2;
      case 0b1000: return 3;
   }
}

class FenceComponent extends ServerComponent {
   public readonly railRenderParts: [RenderPart | null, RenderPart | null, RenderPart | null, RenderPart | null] = [null, null, null, null]
   
   public connectedSidesBitset = 0;
   
   constructor(entity: EntityID) {
      super();

      updateRails(this, entity);
   }
}

export default FenceComponent;

export const FenceComponentArray = new ServerComponentArray<FenceComponent>(ServerComponentType.fence, true, {
   padData: padData,
   updateFromData: updateFromData
});

const addRail = (fenceComponent: FenceComponent, entity: EntityID, railBit: RailBit): void => {
   let textureSource: string;
   let offsetX: number;
   let offsetY: number;
   switch (railBit) {
      case 0b0001: {
         textureSource = "entities/fence/fence-top-rail.png";
         offsetX = 0;
         offsetY = 22;
         break;
      }
      case 0b0010: {
         textureSource = "entities/fence/fence-right-rail.png";
         offsetX = 22;
         offsetY = 0;
         break;
      }
      case 0b0100: {
         textureSource = "entities/fence/fence-bottom-rail.png";
         offsetX = 0;
         offsetY = -22;
         break;
      }
      case 0b1000: {
         textureSource = "entities/fence/fence-left-rail.png";
         offsetX = -22;
         offsetY = 0;
         break;
      }
   }
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderPart.offset.x = offsetX;
   renderPart.offset.y = offsetY;

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   const idx = getRailIdx(railBit);
   fenceComponent.railRenderParts[idx] = renderPart;
}

const removeRail = (fenceComponent: FenceComponent, entity: EntityID, railBit: RailBit): void => {
   const idx = getRailIdx(railBit);

   const renderPart = fenceComponent.railRenderParts[idx];
   if (renderPart === null) {
      throw new Error();
   }
   
   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.removeRenderPart(renderPart);
   fenceComponent.railRenderParts[idx] = null;
}

const checkBit = (fenceComponent: FenceComponent, entity: EntityID, bit: RailBit, connectedSidesBitset: number): void => {
   if ((fenceComponent.connectedSidesBitset & bit) === 0 && (connectedSidesBitset & bit) !== 0) {
      addRail(fenceComponent, entity, bit);
   }

   if ((fenceComponent.connectedSidesBitset & bit) !== 0 && (connectedSidesBitset & bit) === 0) {
      removeRail(fenceComponent, entity, bit);
   }
}

const updateRails = (fenceComponent: FenceComponent, entity: EntityID): void => {
   const structureComponent = StructureComponentArray.getComponent(entity);
   const connectedSidesBitset = structureComponent.connectedSidesBitset;
   
   checkBit(fenceComponent, entity, 0b0001, connectedSidesBitset);
   checkBit(fenceComponent, entity, 0b0010, connectedSidesBitset);
   checkBit(fenceComponent, entity, 0b0100, connectedSidesBitset);
   checkBit(fenceComponent, entity, 0b1000, connectedSidesBitset);

   fenceComponent.connectedSidesBitset = connectedSidesBitset;
}

function padData(): void {}

function updateFromData(_reader: PacketReader, entity: EntityID): void {
   const fenceComponent = FenceComponentArray.getComponent(entity);
   updateRails(fenceComponent, entity);
}