import { useEffect, useRef } from "react";
import "../../css/crafting-menu.css";

const WIDTH = 6;
const HEIGHT = 4;

const Slot = () => {
   return (
      <div className="slot">

      </div>
   );
}

const CraftingMenu = () => {
   const craftingMenuRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      if (craftingMenuRef.current !== null) {
         craftingMenuRef.current.style.setProperty("--width", WIDTH.toString());
         craftingMenuRef.current.style.setProperty("--height", HEIGHT.toString());
      }
   }, []);

   const slots = new Array<JSX.Element>();
   for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
         const idx = y * WIDTH + x;

         slots.push(
            <Slot key={idx} />
         );
      }
   }

   return (
      <div id="crafting-menu" ref={craftingMenuRef}>
         <div className="slots">
            {slots}
         </div>
      </div>
   );
}

export default CraftingMenu;