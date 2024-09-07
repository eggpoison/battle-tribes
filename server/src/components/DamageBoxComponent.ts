import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";
import { boxIsCircular } from "webgl-test-shared/dist/boxes/boxes";
import { getBoxesCollidingEntities } from "webgl-test-shared/dist/hitbox-collision";
import Board from "../Board";
import { onEntityLimbCollision } from "../entities/tribes/limb-use";
import { ServerDamageBoxWrapper } from "../boxes";

export interface DamageBoxComponentParams {}

export class DamageBoxComponent implements DamageBoxComponentParams {
   public damageBoxes = new Array<ServerDamageBoxWrapper>();
   public damageBoxLocalIDs = new Array<number>();
   public nextDamageBoxLocalID = 1;

   public addDamageBox(damageBox: ServerDamageBoxWrapper): void {
      this.damageBoxes.push(damageBox);
      this.damageBoxLocalIDs.push(this.nextDamageBoxLocalID);

      this.nextDamageBoxLocalID++;
   }

   public removeDamageBox(damageBox: ServerDamageBoxWrapper): void {
      const idx = this.damageBoxes.indexOf(damageBox);
      if (idx === -1) {
         // console.warn("Tried to remove a damage box which wasn't on the component.");
         return;
      }

      this.damageBoxes.splice(idx, 1);
      this.damageBoxLocalIDs.splice(idx, 1);
   }
}

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ServerComponentType.damageBox, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(damageBoxComponent: DamageBoxComponent, entity: EntityID): void {
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];

      // Check for removed damage boxes
      if (damageBox.isRemoved) {
         damageBoxComponent.removeDamageBox(damageBox);
         i--;
         continue;
      }

      const collidingEntities = getBoxesCollidingEntities(Board.getWorldInfo(), [damageBox]);
      for (let j = 0; j < collidingEntities.length; j++) {
         const collidingEntity = collidingEntities[j];
         if (collidingEntity !== entity) {
            onEntityLimbCollision(entity, collidingEntity, damageBox.limbInfo, damageBoxComponent);
         }
      }
   }
}

function getDataLength(entity: EntityID): number {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);

   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (boxIsCircular(damageBox.box)) {
         lengthBytes += 7 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 9 * Float32Array.BYTES_PER_ELEMENT;
      }
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   // @Speed: can be made faster if we pre-filter which damage boxes are circular and rectangular
   
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
   
   let numCircularBoxes = 0;
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (boxIsCircular(damageBox.box)) {
         numCircularBoxes++;
      }
   }
   const numRectangularBoxes = damageBoxComponent.damageBoxes.length - numCircularBoxes;
   
   // Circular
   packet.addNumber(numCircularBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      const box = damageBox.box;
      // @Speed
      if (!boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.damageBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.radius);
   }

   // Rectangular
   packet.addNumber(numRectangularBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      const box = damageBox.box;
      // @Speed
      if (boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.damageBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
   }
}