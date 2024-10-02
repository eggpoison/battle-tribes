import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { RenderPart } from "../render-parts/render-parts";
import { Settings } from "battletribes-shared/settings";
import Board from "../Board";
import { createPoisonParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class SlimeSpitComponent extends ServerComponent {
   // @Speed: polymorphism
   public renderParts!: ReadonlyArray<RenderPart>;

   public onLoad(): void {
      this.renderParts = this.entity.getRenderThings("slimeSpit:part", 2) as Array<RenderPart>;
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default SlimeSpitComponent;

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ComponentArrayType.server, ServerComponentType.slimeSpit, true, {
   onTick: onTick
});

function onTick(slimeSpitComponent: SlimeSpitComponent): void {
   slimeSpitComponent.renderParts[0].rotation += 1.5 * Math.PI / Settings.TPS;
   slimeSpitComponent.renderParts[1].rotation -= 1.5 * Math.PI / Settings.TPS;

   if (Board.tickIntervalHasPassed(0.2)) {
      for (let i = 0; i < 5; i++) {
         createPoisonParticle(slimeSpitComponent.entity);
      }
   }
}