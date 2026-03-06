import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData } from "../../networking/packet-snapshots";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface TribeMemberComponentData {
   readonly name: string;
}

export interface TribeMemberComponent {
   name: string;
}

export const TribeMemberComponentArray = new ServerComponentArray<TribeMemberComponent, TribeMemberComponentData, never>(ServerComponentType.tribeMember, true, createComponent, getMaxRenderParts, decodeData);
TribeMemberComponentArray.updateFromData = updateFromData;

export function createTribeMemberComponentData(): TribeMemberComponentData {
   return {
      name: ""
   };
}

function decodeData(reader: PacketReader): TribeMemberComponentData {
   const name = reader.readString();
   return {
      name: name
   };
}

function createComponent(entityComponentData: EntityComponentData): TribeMemberComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tribeMemberComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribeMember);
   return {
      name: tribeMemberComponentData.name
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateFromData(data: TribeMemberComponentData, entity: Entity): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
   tribeMemberComponent.name = data.name;
}