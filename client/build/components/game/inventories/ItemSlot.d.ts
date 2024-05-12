export interface ItemSlotParams {
    readonly picturedItemImageSrc?: any;
    readonly isSelected?: boolean;
    readonly itemCount?: number;
    readonly className?: string;
    readonly onClick?: (e: MouseEvent) => void;
    readonly onMouseDown?: (e: MouseEvent) => void;
    readonly onMouseOver?: (e: MouseEvent) => void;
    readonly onMouseOut?: () => void;
    readonly onMouseMove?: (e: MouseEvent) => void;
    readonly onContextMenu?: (e: MouseEvent) => void;
}
declare const ItemSlot: ({ picturedItemImageSrc, isSelected, itemCount, className, onClick, onMouseOver, onMouseOut, onMouseMove, onMouseDown, onContextMenu }: ItemSlotParams) => import("react/jsx-runtime").JSX.Element;
export default ItemSlot;
