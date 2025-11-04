import { useEffect, useState } from "react";
import { Entity } from "../../../../shared/src/entities";
import Menu from "./menus/Menu";
import { FloorSignComponentArray } from "../../game/entity-components/server-components/FloorSignComponent";
import { sendSetSignMessagePacket } from "../../game/networking/packet-sending";
import { closeCurrentMenu } from "../../game/menus";

export let SignInscribeMenu_setEntity: (entity: Entity | null) => void = () => {};

const SignInscribeMenu = () => {
   const [entity, setEntity] = useState<Entity | null>(null);
   const [message, setMessage] = useState("");
   
   useEffect(() => {
      SignInscribeMenu_setEntity = (entity: Entity | null) => {
         setEntity(entity);

         if (entity !== null) {
            const floorSignComponent = FloorSignComponentArray.getComponent(entity);
            setMessage(floorSignComponent.message);
         }
      }
   }, []);

   if (entity === null) {
      return;
   }

   const inscribe = (): void => {
      sendSetSignMessagePacket(entity, message);
      closeCurrentMenu();
   }

   const updateMessage = (e: InputEvent): void => {
      const message = (e.target as HTMLInputElement).value;
      setMessage(message);
   }

   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   
   return <Menu id="sign-inscribe-menu" className="menu">
      <h2 className="menu-title">Inscribe Sign</h2>

      <input className="message" type="text" defaultValue={floorSignComponent.message} onChange={e => updateMessage(e.nativeEvent as InputEvent)}></input>

      <button onClick={inscribe}>Done</button>
   </Menu>;
}

export default SignInscribeMenu;