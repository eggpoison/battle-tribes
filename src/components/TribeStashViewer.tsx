import { useEffect, useRef, useState } from "react";
import TribeStash from "../entities/TribeStash";
import InfiniteInventoryViewerManager from "./inventory/InfiniteInventoryViewerManager";
import InventoryViewer from "./inventory/InventoryViewer";
import InventoryViewerManager from "./inventory/InventoryViewerManager";
import { setMessageDisplay } from "./MessageDisplay";

export let toggleTribeStashViewerVisibility: () => void;

const TribeStashViewer = () => {
   const [isVisible, setIsVisible] = useState<boolean>(false);
   const tribeStashViewerManagerRef = useRef<InventoryViewerManager | null>(
      !InventoryViewerManager.hasInstance("tribeStash") ? new InfiniteInventoryViewerManager("tribeStash") : InventoryViewerManager.getInstance("tribeStash")
   );
   
   useEffect(() => {
      toggleTribeStashViewerVisibility = (): void => {
         const newIsVisible = isVisible ? false : true;
         if (newIsVisible) {
            setMessageDisplay(TribeStash.CLOSE_MESSAGE);
         } else {
            setMessageDisplay(TribeStash.OPEN_MESSAGE);
         }
         setIsVisible(newIsVisible);
      }
   }, [isVisible]);

   return isVisible ? (
      <div id="tribe-stash-viewer">
         <InventoryViewer inventoryViewerManager={tribeStashViewerManagerRef.current!} />
      </div>
   ) : null;
}

export default TribeStashViewer;