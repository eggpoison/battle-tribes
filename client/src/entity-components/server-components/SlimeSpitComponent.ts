import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { RenderPart } from "../../render-parts/render-parts";
import { Settings } from "battletribes-shared/settings";
import Board from "../../Board";
import { createPoisonParticle } from "../../particles";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { playSound } from "../../sound";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

class SlimeSpitComponent extends ServerComponent {
   // @Speed: polymorphism
   public renderParts!: ReadonlyArray<RenderPart>;
}

export default SlimeSpitComponent;

export const SlimeSpitComponentArray = new ServerComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, {
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(slimeSpitComponent: SlimeSpitComponent, entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);
   slimeSpitComponent.renderParts = renderInfo.getRenderThings("slimeSpit:part", 2) as Array<RenderPart>;

   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("slime-spit.mp3", 0.5, 1, transformComponent.position);
}

function onTick(slimeSpitComponent: SlimeSpitComponent, entity: EntityID): void {
   slimeSpitComponent.renderParts[0].rotation += 1.5 * Math.PI / Settings.TPS;
   slimeSpitComponent.renderParts[1].rotation -= 1.5 * Math.PI / Settings.TPS;

   if (Board.tickIntervalHasPassed(0.2)) {
      for (let i = 0; i < 5; i++) {
         createPoisonParticle(entity);
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}