import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";

// export interface BlockAttackComponentData {
//    readonly hasBlocked: boolean;
// }

// export interface BlockAttackComponent {
//    hasBlocked: boolean;
// }

// export const BlockAttackComponentArray = new ServerComponentArray<BlockAttackComponent, BlockAttackComponentData, never>(ServerComponentType.blockAttack, true, createComponent, getMaxRenderParts, decodeData);
// BlockAttackComponentArray.updateFromData = updateFromData;

// function decodeData(reader: PacketReader): BlockAttackComponentData {
//    const hasBlocked = reader.readBool();
//    return {
//       hasBlocked: hasBlocked
//    };
// }

// function createComponent(entityComponentData: EntityComponentData): BlockAttackComponent {
//    const blockAttackComponentData = entityComponentData.serverComponentData.get(ServerComponentType.blockAttack)!;
   
//    return {
//       hasBlocked: blockAttackComponentData.hasBlocked
//    };
// }

// function getMaxRenderParts(): number {
//    return 0;
// }

// function updateFromData(data: BlockAttackComponentData, entity: Entity): void {
//    const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
//    blockAttackComponent.hasBlocked = data.hasBlocked;
// }