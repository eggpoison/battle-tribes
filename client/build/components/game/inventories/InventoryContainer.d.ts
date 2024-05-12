import { Inventory } from "webgl-test-shared/dist/items";
interface InventoryProps {
    readonly entityID: number;
    readonly inventory: Inventory;
    readonly className?: string;
    readonly selectedItemSlot?: number;
    readonly isBordered?: boolean;
}
declare const InventoryContainer: ({ entityID, inventory, className, selectedItemSlot, isBordered }: InventoryProps) => import("react/jsx-runtime").JSX.Element;
export default InventoryContainer;
