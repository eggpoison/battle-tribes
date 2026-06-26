import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TribeMemberComponentData {
   readonly name: string;
}

export interface TribeMemberComponent {
   name: string;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribeMember, typeof TribeMemberComponentArray> {}
}

export const TribeMemberComponentArray = registerServerComponentArray(
   ServerComponentType.tribeMember,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
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