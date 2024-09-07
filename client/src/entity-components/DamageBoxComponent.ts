import ServerComponent from "./ServerComponent";
import { PacketReader } from "webgl-test-shared/dist/packets";
import Entity from "../Entity";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { Point } from "webgl-test-shared/dist/utils";
import { BoxType, createDamageBox, DamageBoxWrapper, updateBox } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { TransformComponentArray } from "./TransformComponent";

class DamageBoxComponent extends ServerComponent {
   public readonly damageBoxes = new Array<DamageBoxWrapper>();
   private readonly damageBoxLocalIDs = new Array<number>();
   private readonly damageBoxesRecord: Partial<Record<number, DamageBoxWrapper>> = {};
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.readInData(reader, false);
   }

   public padData(reader: PacketReader): void {
      const numCircular = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numCircular);
      const numRectangular = reader.readNumber();
      reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT * numRectangular);
   }

   // @Hack: shouldUpdate system
   private readInData(reader: PacketReader, shouldUpdate: boolean): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);

      // @Speed
      const missingLocalIDs = this.damageBoxLocalIDs.slice();
      
      const numCircular = reader.readNumber();
      for (let i = 0; i < numCircular; i++) {
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();

         const existingDamageBox = this.damageBoxesRecord[localID] as DamageBoxWrapper<BoxType.circular> | undefined;
         if (typeof existingDamageBox !== "undefined") {
            existingDamageBox.box.offset.x = offsetX;
            existingDamageBox.box.offset.y = offsetY;
            existingDamageBox.box.radius = radius;
            if (shouldUpdate) {
               // @Cleanup: Copy and paste
               updateBox(existingDamageBox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
            }

            missingLocalIDs.splice(missingLocalIDs.indexOf(localID));
         } else {
            const box = new CircularBox(new Point(offsetX, offsetY), radius);
            const damageBox = createDamageBox(box);
            if (shouldUpdate) {
               // @Cleanup: Copy and paste
               updateBox(damageBox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
            }

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         }
      }

      const numRectangular = reader.readNumber();
      for (let i = 0; i < numRectangular; i++) {
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();

         const existingDamageBox = this.damageBoxesRecord[localID] as DamageBoxWrapper<BoxType.rectangular> | undefined;
         if (typeof existingDamageBox !== "undefined") {
            existingDamageBox.box.offset.x = offsetX;
            existingDamageBox.box.offset.y = offsetY;
            existingDamageBox.box.width = width;
            existingDamageBox.box.height = height;
            existingDamageBox.box.relativeRotation = relativeRotation;
            if (shouldUpdate) {
               // @Cleanup: Copy and paste
               updateBox(existingDamageBox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
            }

            missingLocalIDs.splice(missingLocalIDs.indexOf(localID));
         } else {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            const damageBox = createDamageBox(box);
            if (shouldUpdate) {
               // @Cleanup: Copy and paste
               updateBox(damageBox.box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
            }

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         }
      }

      for (const localID of missingLocalIDs) {
         const damageBox = this.damageBoxesRecord[localID]!;
         const idx = this.damageBoxes.indexOf(damageBox);

         this.damageBoxes.splice(idx, 1);
         this.damageBoxLocalIDs.splice(idx, 1);
         delete this.damageBoxesRecord[localID];
      }
   }

   public updateFromData(reader: PacketReader): void {
      this.readInData(reader, true);
   }

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);
   }
}

export default DamageBoxComponent;

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ComponentArrayType.server, ServerComponentType.damageBox, true, {});