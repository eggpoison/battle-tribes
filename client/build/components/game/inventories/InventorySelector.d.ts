export declare enum InventoryMenuType {
    none = 0,
    barrel = 1,
    tribesman = 2,
    campfire = 3,
    furnace = 4,
    tombstone = 5,
    ammoBox = 6
}
export declare let InventorySelector_setInventoryMenuType: (inventoryMenuType: InventoryMenuType) => void;
export declare let InventorySelector_forceUpdate: () => void;
export declare let InventorySelector_inventoryIsOpen: () => boolean;
declare const InventorySelector: () => import("react/jsx-runtime").JSX.Element | null;
export default InventorySelector;
