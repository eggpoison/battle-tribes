import { GameInteractState } from "./GameScreen";

interface SelectCarryTargetCursorOverlayProps {
   readonly gameInteractState: GameInteractState;
   readonly mouseX: number;
   readonly mouseY: number;
}

const SelectTargetCursorOverlay = (props: SelectCarryTargetCursorOverlayProps) => {
   let className: string;
   switch (props.gameInteractState) {
      case GameInteractState.selectCarryTarget:
      case GameInteractState.selectRiderDepositLocation: {
         className = "carry";
         break;
      }
      case GameInteractState.selectMoveTargetPosition: {
         className = "move";
         break;
      }
      case GameInteractState.selectAttackTarget: {
         className = "attack";
         break;
      }
      default: {
         throw new Error();
      }
   }
   return <div id="select-carry-target-cursor-overlay" className={className} style={{left: props.mouseX + "px", top: props.mouseY + "px"}}></div>;
}

export default SelectTargetCursorOverlay;