import { getSpectatorHasInstantMovement, getSpectatorSpeed, setSpectatorHasInstantMovement, setSpectatorSpeed } from "./GameInteractableLayer";
import Menu from "./menus/Menu";

const SpectatorControls = () => {
   const onSpeedChange = (e: Event) => {
      const speed = Number((e.target as HTMLInputElement).value);
      setSpectatorSpeed(speed);
   }

   const onInstantMovementCheckboxChange = (e: Event) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      setSpectatorHasInstantMovement(isChecked);
   }
   
   return <Menu id="spectator-controls" className="menu">
      <label>
         Speed
         <input type="range" min={100} max={1000} step={50} defaultValue={getSpectatorSpeed()} onChange={e => onSpeedChange(e.nativeEvent)} />
      </label>
      <label>
         Instant movement
         <input type="checkbox" defaultChecked={getSpectatorHasInstantMovement()} onChange={e => onInstantMovementCheckboxChange(e.nativeEvent)} />
      </label>
   </Menu>;
}

export default SpectatorControls;