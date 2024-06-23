import { useCallback, useEffect, useRef, useState } from "react";
import { getItemTypeImage } from "../../client-item-info";
import { ItemType } from "webgl-test-shared/dist/items/items";

export let HeldItem_setHeldItemCount: (count: number) => void = () => {};
export let HeldItem_setHeldItemType: (itemType: ItemType | null) => void = () => {};

export let setHeldItemVisualPosition: (xPixels: number, yPixels: number) => void;

const HeldItem = () => {
   const [heldItemCount, setHeldItemCount] = useState(0);
   const [heldItemType, setHeldItemType] = useState<ItemType | null>(null);
   
   const [mousePosition, setMousePosition] = useState<[number, number] | null>(null);
   const heldItemElementRef = useRef<HTMLDivElement | null>(null);
   const hasLoaded = useRef(false);

   const updateMousePosition = (e: MouseEvent): void => {
      setMousePosition([e.clientX, e.clientY]);
   }

   const onRefChange = useCallback((node: HTMLDivElement | null) => {
      if (node !== null) {
         heldItemElementRef.current = node;

         if (mousePosition !== null) {
            heldItemElementRef.current.style.left = mousePosition[0] + "px";
            heldItemElementRef.current.style.top = mousePosition[1] + "px";
         }
      }
   }, [mousePosition]);
   
   useEffect(() => {
      if (!hasLoaded.current) {
         // Update the position of the held item on mouse move
         document.addEventListener("mousemove", e => updateMousePosition(e));
         
         hasLoaded.current = true;
      }
      
      HeldItem_setHeldItemCount = setHeldItemCount;
      HeldItem_setHeldItemType = setHeldItemType;

      setHeldItemVisualPosition = (xPixels: number, yPixels: number): void => {
         setMousePosition([xPixels, yPixels]);
      }
   }, []);

   useEffect(() => {
      if (heldItemElementRef.current !== null && mousePosition !== null) {
         heldItemElementRef.current.style.left = mousePosition[0] + "px";
         heldItemElementRef.current.style.top = mousePosition[1] + "px";
      }
   }, [mousePosition]);

   if (heldItemType === null) return null;

   const heldItemDisplayCount = heldItemCount > 1 ? heldItemCount : "";
   
   return <div id="held-item" ref={onRefChange}>
      <img className="held-item-icon" src={getItemTypeImage(heldItemType)} alt="" />
      <div className="held-item-count">{heldItemDisplayCount}</div>
   </div>;
}

export default HeldItem;