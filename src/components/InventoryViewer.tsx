import { useEffect, useRef, useState } from "react";
import Player from "../entities/Player";
import { ItemSlots } from "../entity-components/InventoryComponent";
import ITEMS, { ItemName } from "../items";

let setInventoryViewerSlotCount: (newSlotCount: number) => void;
let updateInventoryViewer: (itemSlots: ItemSlots) => void;

export abstract class InventoryViewerManager {
    public static setSlotCount(newSlotCount: number): void {
        setInventoryViewerSlotCount(newSlotCount);
    }

    public static update(itemSlots: ItemSlots): void {
        updateInventoryViewer(itemSlots);
    }
}

function InventoryViewer() {
    const inventoryViewerRef = useRef<HTMLDivElement | null>(null);

    const [itemSlots, setItemSlots] = useState(new Array<[ItemName, number]>());
    const [slotCount, setSlotCount] = useState(Player.DEFAULT_INVENTORY_SLOT_COUNT);

    useEffect(() => {
        updateInventoryViewer = (itemSlots: ItemSlots): void => {
            setItemSlots(itemSlots.slice());
        }

        setInventoryViewerSlotCount = (newSlotCount: number): void => {
            if (inventoryViewerRef.current !== null) {
                inventoryViewerRef.current.style.setProperty("--slot-count", newSlotCount.toString());
            }
            setSlotCount(newSlotCount);
        }
    }, []);

    const slotElements = new Array<JSX.Element>();
    for (let i = 0; i < slotCount; i++) {
        if (i >= itemSlots.length) {
            slotElements.push(
                <div className="slot" key={i}></div>
            );
            continue;
        }

        const [itemName, itemCount] = itemSlots[i];

        const itemID = ItemName[itemName] as unknown as ItemName;
        const item = ITEMS[itemID];

        const imageSrc = require("../images/" + item.imageSrc);
        slotElements.push(
            <div className="slot" key={i}>
                <img src={imageSrc} alt={itemName as unknown as string} className="preview" />
                <div className="item-count">{itemCount}</div>
            </div>
        );
    }

    return (
        <div id="inventory-viewer" ref={inventoryViewerRef}>
            {slotElements}
        </div>
    );
}

export default InventoryViewer;