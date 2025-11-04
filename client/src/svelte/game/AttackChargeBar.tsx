import { Settings } from "../../../../shared/src/settings";

interface AttackChargeBarProps {
   readonly mouseX: number;
   readonly mouseY: number;
   readonly chargeElapsedTicks: number;
   readonly chargeDuration: number;
}

const AttackChargeBar = (props: AttackChargeBarProps) => {
   const elapsedTicks = props.chargeElapsedTicks;
   const duration = props.chargeDuration;
   
   const progress = elapsedTicks / duration;
   const opacity = elapsedTicks <= duration ? 1 : Math.max(1 - (elapsedTicks - duration) * Settings.DT_S, 0);
   return elapsedTicks !== -1 || opacity === 0 ? <div id="attack-charge-bar" draggable={false} style={{"left": props.mouseX + 2 + "px", "top": props.mouseY + "px", "opacity": opacity}}>
      <div style={{"--chargeProgress": Math.min(progress, 1)} as React.CSSProperties} className="charge-bar"></div>
   </div> : null;
}

export default AttackChargeBar;