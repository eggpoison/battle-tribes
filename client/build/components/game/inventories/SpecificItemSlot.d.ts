import { ItemType } from "webgl-test-shared/dist/items";
import { ItemSlotParams } from "./ItemSlot";
interface SpecificItemSlotParams extends ItemSlotParams {
    readonly itemType?: ItemType;
    readonly itemCount?: number;
    canDropItem?(): void;
}
declare const SpecificItemSlot: ({ itemType, itemCount, isSelected, className, onClick, onMouseOver, onMouseOut, onMouseMove, onMouseDown, onContextMenu, canDropItem }: SpecificItemSlotParams) => import("react/jsx-runtime").JSX.Element;
export default SpecificItemSlot;
