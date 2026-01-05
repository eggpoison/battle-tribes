import { Point } from "./utils";

// @Cleanup: maybe extract into client-to-server and server-to-client ?
export enum PacketType {
   // -----------------
   // CLIENT-TO-SERVER
   // -----------------
   initialPlayerData,
   activate,
   // @Cleanup: unused?
   deactivate,
   playerData,
   // @Cleanup: unused?
   syncRequest,
   attack,
   respawn,
   startItemUse,
   useItem,
   stopItemUse,
   dropItem,
   itemPickup,
   itemTransfer,
   itemRelease,
   summonEntity,
   toggleSimulation,
   placeBlueprint,
   craftItem,
   devSetDebugEntity,
   ascend,
   structureInteract,
   structureUninteract,
   unlockTech,
   selectTech,
   studyTech,
   animalStaffFollowCommand,
   mountCarrySlot,
   dismountCarrySlot,
   pickUpEntity,
   modifyBuilding,
   setCarryTarget,
   selectRiderDepositLocation,
   setMoveTargetPosition,
   setAttackTarget,
   completeTamingTier,
   setSignMessage,
   renameAnimal,
   chatMessage,
   deconstructBuilding,
   recruitTribesman,
   respondToTitleOffer,
   terminalCommand,
   // @Hack
   setSpectatingPosition,
   openEntityInventory,
   closeEntityInventory,
   forceCompleteTamingTier, // ((DEV))
   acquireTamingSkill,
   forceAcquireTamingSkill, // ((DEV))
   forceUnlockTech, // ((DEV))
   devGiveItem, // ((DEV))
   devTPToEntity, // ((DEV))
   devSpectateEntity, // ((DEV))
   devSetAutogiveBaseResource, // ((DEV))
   devSetViewedSpawnDistribution, // ((DEV))
   devGiveTitle, // ((DEV))
   devRemoveTitle, // ((DEV))
   devCreateTribe, // ((DEV))
   devChangeTribeType, // ((DEV))
   // -----------------
   // SERVER-TO-CLIENT
   // -----------------
   initialGameData,
   gameData,
   devGameData, // ((DEV))
   // @Cleanup: unused?
   syncData,
   sync,
   forcePositionUpdate,
   // @CLEANUP i snapped on the 'serverToClient' prefix to this cuz chatMessage was taken to the client-to-server packet
   serverToClientChatMessage,
   simulationStatusUpdate
}

// @Bandwidth: figure out a way to be tightly packed (not have to add padding)
// @Bandwidth: split number into addFloat, addUInt8, and addUInt16

abstract class BasePacketObject {
   public currentByteOffset: number;

   constructor(byteOffset: number) {
      this.currentByteOffset = byteOffset;
   }
   
   public padOffset(paddingBytes: number): void {
      this.currentByteOffset += paddingBytes;
   }
}

// @Hack: remove once packets are tightly packed
export function alignLengthBytes(lengthBytes: number): number {
   if (lengthBytes % 4 !== 0) {
      return lengthBytes + 4 - lengthBytes % 4;
   }
   return lengthBytes;
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export class Packet extends BasePacketObject {
   public readonly buffer: ArrayBuffer;
   private readonly floatView: Float32Array;
   private readonly uint8View: Uint8Array;
   
   constructor(packetType: PacketType, lengthBytes: number) {
      super(0);

      this.buffer = new ArrayBuffer(lengthBytes);
      this.floatView = new Float32Array(this.buffer);
      this.uint8View = new Uint8Array(this.buffer);

      this.writeNumber(packetType);
   }

   public writeNumber(number: number): void {
      if (isNaN(number)) {
         throw new Error("Tried to write NaN to a packet.");
      }
      
      // Make sure there is room for 4 bytes for the number
      if (this.currentByteOffset + 4 > this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }
      if (this.currentByteOffset % 4 !== 0) {
         throw new Error("Misaligned");
      }

      this.floatView[this.currentByteOffset / 4] = number;
      
      this.currentByteOffset += 4;
   }

   public writeString(str: string): void {
      // @Speed: could be using .encodeInto instead!!
      const encodedUsername = utf8Encoder.encode(str);
      const lengthBytes = encodedUsername.length;
      
      if (this.currentByteOffset + lengthBytes > this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }

      this.writeNumber(lengthBytes);
      this.uint8View.set(encodedUsername, this.currentByteOffset);
      this.currentByteOffset += alignLengthBytes(encodedUsername.byteLength);
   }

   public writeBool(boolean: boolean): void {
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }

      this.uint8View[this.currentByteOffset] = boolean ? 1 : 0;
      this.currentByteOffset++;
      
      // @Bandwidth
      this.padOffset(3);
   }

   public writePoint(point: Point): void {
      this.writeNumber(point.x);
      this.writeNumber(point.y);
   }
}

export function getStringLengthBytes(str: string): number {
   // @Copynpaste
   return Float32Array.BYTES_PER_ELEMENT + alignLengthBytes(utf8Encoder.encode(str).byteLength); // @Speed?
}

export class PacketReader extends BasePacketObject {
   private readonly startPaddingBytes: number;
   private readonly buffer: ArrayBufferLike;
   
   private readonly uint8View: Uint8Array;
   // private readonly floatView: Float32Array;
   private readonly view: DataView;

   constructor(buffer: ArrayBufferLike, startPaddingBytes: number) {
      super(startPaddingBytes);

      this.startPaddingBytes = startPaddingBytes;
      this.buffer = buffer;
      
      this.uint8View = new Uint8Array(buffer);
      // this.floatView = new Float32Array(buffer);
      this.view = new DataView(buffer);
   }

   public readNumber(): number {
      // this.cleanByteOffset();
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }
      if ((this.currentByteOffset - this.startPaddingBytes) % 4 !== 0) {
         throw new Error("Misaligned");
      }

      // const number = this.buffer.readFloatLE(this.currentByteOffset);
      // const number = this.floatView[this.currentByteOffset / 4];
      const number = this.view.getFloat32(this.currentByteOffset, true);
      
      this.currentByteOffset += 4;

      return number;
   }

   public readString(): string {
      const stringLength = this.readNumber();
      
      const decodeBuffer = this.uint8View.subarray(this.currentByteOffset, this.currentByteOffset + stringLength);
      const string = utf8Decoder.decode(decodeBuffer);

      const lengthBytes = alignLengthBytes(new TextEncoder().encode(string).byteLength); // @Speed?
      this.currentByteOffset += lengthBytes;

      return string;
   }

   public padString(): void {
      this.readString();
   }

   public readBool(): boolean {
      const boolean = this.uint8View[this.currentByteOffset];
      this.currentByteOffset++;

      // @Bandwidth
      this.padOffset(3);

      if (boolean === 1) {
         return true;
      } else if (boolean === 0) {
         return false
      } else {
         throw new Error("Buffer data is not in boolean form.");
      }
   }

   readPoint(): Point {
      const x = this.readNumber();
      const y = this.readNumber();
      return new Point(x, y);
   }
}