import { ItemType } from "webgl-test-shared/dist/items";
export type ClientItemInfo = {
    readonly entityTextureSource: string;
    readonly textureSource: string;
    /** Texture source when used as a tool in a tribe members' hand. Empty string if not used as a tool */
    readonly toolTextureSource: string;
    readonly name: string;
    readonly description: string;
};
declare const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo>;
export declare function getItemTypeImage(itemType: ItemType): any;
export default CLIENT_ITEM_INFO_RECORD;
