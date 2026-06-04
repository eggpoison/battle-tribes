import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TileType } from "../../../shared/dist/tiles.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { destroyEntity, getEntityLayer } from "../world.js";
import { AIHelperComponentArray, AIType } from "./AIHelperComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { detachHitbox, TransformComponentArray } from "./TransformComponent.js";
import { getHitboxTile } from "../hitboxes.js";

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
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const sandBallComponent = SandBallComponentArray.getComponent(entity);
   packet.writeNumber(Math.floor(sandBallComponent.size));
}