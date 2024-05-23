import { FenceComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

type RailBit = 0b0001 | 0b0010 | 0b0100 | 0b1000;

const getRailIdx = (railBit: RailBit): number => {
   switch (railBit) {
      case 0b0001: return 0;
      case 0b0010: return 1;
      case 0b0100: return 2;
      case 0b1000: return 3;
   }
}

class FenceComponent extends ServerComponent<ServerComponentType.fence> {
   private readonly railRenderParts: [RenderPart | null, RenderPart | null, RenderPart | null, RenderPart | null] = [null, null, null, null]
   
   private connectedSidesBitset = 0;
   
   constructor(entity: Entity, _data: FenceComponentData) {
      super(entity);

      this.updateRails();
   }

   private addRail(railBit: RailBit): void {
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
      
      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex(textureSource),
         0,
         0
      );
      renderPart.offset.x = offsetX;
      renderPart.offset.y = offsetY;

      this.entity.attachRenderPart(renderPart);

      const idx = getRailIdx(railBit);
      this.railRenderParts[idx] = renderPart;
   }

   private removeRail(railBit: RailBit): void {
      const idx = getRailIdx(railBit);

      const renderPart = this.railRenderParts[idx];
      if (renderPart === null) {
         throw new Error();
      }
      
      this.entity.removeRenderPart(renderPart);
      this.railRenderParts[idx] = null;
   }

   private checkBit(bit: RailBit, connectedSidesBitset: number): void {
      if ((this.connectedSidesBitset & bit) === 0 && (connectedSidesBitset & bit) !== 0) {
         this.addRail(bit);
      }

      if ((this.connectedSidesBitset & bit) !== 0 && (connectedSidesBitset & bit) === 0) {
         this.removeRail(bit);
      }
   }

   private updateRails(): void {
      const structureComponent = this.entity.getServerComponent(ServerComponentType.structure);
      const connectedSidesBitset = structureComponent.connectedSidesBitset;
      
      this.checkBit(0b0001, connectedSidesBitset);
      this.checkBit(0b0010, connectedSidesBitset);
      this.checkBit(0b0100, connectedSidesBitset);
      this.checkBit(0b1000, connectedSidesBitset);

      this.connectedSidesBitset = connectedSidesBitset;
   }
   
   public updateFromData(_data: FenceComponentData): void {
      this.updateRails();
   }
}

export default FenceComponent;