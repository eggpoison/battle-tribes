import { useEffect } from "react";
import { sendAscendPacket } from "../../game/networking/packet-sending";

const LayerChangeMessage = () => {
   useEffect(() => {
      const onKeyPress = (e: KeyboardEvent): void => {
         if (e.key === " ") {
            sendAscendPacket();
         }
      }

      document.addEventListener("keydown", onKeyPress);

      return () => {
         document.removeEventListener("keydown", onKeyPress);
      };
   }, []);
   
   return <div id="layer-change-message">
      Press [space] to ascend
   </div>;
}

export default LayerChangeMessage;