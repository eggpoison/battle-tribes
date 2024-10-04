import { ServerComponentType } from "../../../shared/src/components";
import { PacketReader } from "../../../shared/src/packets";
import { Point } from "../../../shared/src/utils";
import { Light, addLight, attachLightToEntity, attachLightToRenderPart } from "../lights";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

export class GuardianSpikyBallComponent extends ServerComponent {
   public onLoad(): void {
      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
      );
      this.entity.attachRenderThing(renderPart);

      const light: Light = {
         offset: new Point(0, 0),
         intensity: 0.4,
         strength: 0.3,
         radius: 20,
         r: 0.9,
         g: 0.2,
         b: 0.9
      };
      const lightID = addLight(light);
      attachLightToEntity(lightID, this.entity.id);
   }
   
   public padData(reader: PacketReader): void {}

   public updateFromData(reader: PacketReader, isInitialData: boolean): void {}
}

export const GuardianSpikyBallComponentArray = new ComponentArray<ServerComponent>(ComponentArrayType.server, ServerComponentType.guardianSpikyBall, true, {});