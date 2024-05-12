import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import BerryBush from "../entities/BerryBush";

class BerryBushComponent extends ServerComponent<ServerComponentType.berryBush> {
   private readonly renderPart: RenderPart;
   
   constructor(entity: Entity, data: BerryBushComponentData, renderPart: RenderPart) {
      super(entity);

      this.renderPart = renderPart;

      this.updateFromData(data);
   }

   public updateFromData(data: BerryBushComponentData): void {
      const numBerries = data.numBerries;
      this.renderPart.switchTextureSource(BerryBush.TEXTURE_SOURCES[numBerries]);
   }
}

export default BerryBushComponent