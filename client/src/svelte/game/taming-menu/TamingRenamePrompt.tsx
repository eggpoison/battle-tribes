import { useCallback, useEffect, useRef, useState } from "react";
import Menu from "../menus/Menu";
import { closeCurrentMenu } from "../../../game/menus";
import { sendRenameAnimalPacket } from "../../../game/networking/packet-sending";
import { Entity } from "../../../../../shared/src/entities";

export let TamingRenamePrompt_open: (entity: Entity) => void = () => {};
export let TamingRenamePrompt_close: () => void = () => {};

const TamingRenamePrompt = () => {
   const inputRef = useRef<HTMLInputElement | null>(null);
   const [entity, setEntity] = useState(0);
   const [isVisible, setIsVisible] = useState(false);

   useEffect(() => {
      TamingRenamePrompt_open = (entity: Entity): void => {
         setEntity(entity);
         setIsVisible(true);
      }
      TamingRenamePrompt_close = (): void => {
         setIsVisible(false);
      }
   }, []);

   const doRename = useCallback((): void => {
      const inputElem = inputRef.current;
      if (inputElem !== null) {
         const name = inputElem.value;
         sendRenameAnimalPacket(entity, name);
      }
      
      closeCurrentMenu();
   }, [entity]);

   const cancelRename = (): void => {
      closeCurrentMenu();
   }

   if (!isVisible) {
      return null;
   }
   
   return <Menu id="taming-rename-prompt" className="menu">
      <p>Choose a name for your animal:</p>
      <input ref={inputRef} type="text" />
      <button onClick={doRename}>Done</button>
      <button onClick={cancelRename}>Cancel</button>
   </Menu>;
}

export default TamingRenamePrompt;