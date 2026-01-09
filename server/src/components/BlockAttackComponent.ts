import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { InventoryName } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { applyKnockback, getHitboxMomentum, Hitbox } from "../hitboxes";
import { createShieldKnockPacket } from "../server/packet-sending";
import { registerDirtyEntity } from "../server/player-clients";
import { destroyEntity, entityExists, getEntityType, getGameTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getCurrentLimbState, getHeldItem, LimbInfo } from "./InventoryUseComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
// import { setHitboxToLimbState, SwingAttackComponentArray } from "./SwingAttackComponent";
// import { attachHitbox, TransformComponentArray } from "./TransformComponent";

// export class BlockAttackComponent {
//    public readonly owner: Entity;
//    public readonly limb: LimbInfo;
//    public readonly blockType: BlockType;
//    // @Cleanup: Is this necessary? Could we do it with just a tick event?
//    // @Hack: surely this shouldn't exist - shields can block multiple times
//    public hasBlocked = false;

//    constructor(owner: Entity, limb: LimbInfo, blockType: BlockType) {
//       this.owner = owner;
//       this.limb = limb;
//       this.blockType = blockType;
//    }
// }

// export const BlockAttackComponentArray = new ComponentArray<BlockAttackComponent>(ServerComponentType.blockAttack, true, getDataLength, addDataToPacket);
// BlockAttackComponentArray.onHitboxCollision = onHitboxCollision;
// BlockAttackComponentArray.onTick = {
//    tickInterval: 1,
//    func: onTick
// };

// function getDataLength(): number {
//    return Float32Array.BYTES_PER_ELEMENT;
// }

// function addDataToPacket(packet: Packet, entity: Entity): void {
//    const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
//    packet.writeBool(blockAttackComponent.hasBlocked);
// }

// // @COPYNPASTE from the ditto in SwingAttackComponent
// function onTick(blockAttack: Entity): void {
//    // @HACK: this is garbage and may cause the hitbox to lag behind. should instead bind the entity to the limb hitbox. . .
   
//    const transformComponent = TransformComponentArray.getComponent(blockAttack);
//    const limbHitbox = transformComponent.hitboxes[0];
   
//    const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
//    const limb = blockAttackComponent.limb;

//    // @HACK @TEMPORARY! here cuz somtimes ownerTransformComponent is undefined (???) which crashes the server
//    if (!entityExists(blockAttackComponent.owner)) {
//       return;
//    }
   
//    const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
//    const ownerTransformComponent = TransformComponentArray.getComponent(blockAttackComponent.owner);
//    setHitboxToLimbState(ownerTransformComponent, transformComponent, limbHitbox, getCurrentLimbState(limb), isFlipped);
// }