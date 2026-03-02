import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { TileType } from "../../../shared/src/tiles";
import { getHitboxTile } from "../hitboxes";
import { destroyEntity, getEntityLayer } from "../world";
import { AIHelperComponentArray, AIType } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { detachHitbox, TransformComponentArray } from "./TransformComponent";

export class SandBallComponent {
   public size = 1;
}

export const SandBallComponentArray = new ComponentArray<SandBallComponent>(ServerComponentType.sandBall, true, getDataLength, addDataToPacket);
SandBallComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
 
function onTick(sandBall: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(sandBall);
   const hitbox = transformComponent.hitboxes[0];
   
   // @HACK @SPEED
   if (hitbox.parent !== null) {
      const aiHelperComponent = AIHelperComponentArray.getComponent(hitbox.parent.entity);
      if (aiHelperComponent.currentAIType !== AIType.sandBalling) {
         detachHitbox(hitbox);
      }
   }

   // While in water sand balls have a chance of disintegrating
   const tile = getHitboxTile(hitbox);
   const layer = getEntityLayer(sandBall);
   if (layer.getTileType(tile) === TileType.water && Math.random() < 0.3 * Settings.DT_S) {
      destroyEntity(sandBall);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const sandBallComponent = SandBallComponentArray.getComponent(entity);
   packet.writeNumber(Math.floor(sandBallComponent.size));
}