import HealthIcon from "../../images/miscellaneous/health.png";
import { assert } from "../../../../shared/src";

let healthBarElem: HTMLElement | null = null;
let healthCounterNode: Text | null = null;

export function createHealthBar(): void {
   assert(healthBarElem === null);
   
   healthBarElem = document.createElement("div");
   healthBarElem.id = "health-bar";
   healthBarElem.classList.add("animated");
   // @Cleanup: 20 default is strange
   healthBarElem.style.setProperty("--current-health", "20");
   healthBarElem.style.setProperty("--previous-health", "20");
   healthBarElem.innerHTML = `
      <div class="health-icon">
         <img alt="" />
         <div class="health-counter">{}</div>
      </div>
      <div class="health-slider"></div>
      <div class="health-flash"></div>
      <div class="health-bar-notches"></div>
      <div class="health-mask"></div>
   `;
   document.body.appendChild(healthBarElem);

   healthBarElem.querySelector("img")!.src = HealthIcon;
   healthCounterNode = healthBarElem.querySelector(".health-counter")!.firstChild as Text;
   // @Cleanup @Copynpaste: use a utils function for this
   healthCounterNode.data = (Math.round((20 + Number.EPSILON) * 100) / 100).toString();
}

export function destroyHealthBar(): void {
   assert(healthBarElem !== null);

   healthBarElem.remove();
   healthBarElem = null;
}

export function HealthBar_setHealth(health: number): void {
   assert(healthBarElem !== null && healthCounterNode !== null);

   const previousHealthStr = healthBarElem.style.getPropertyValue("--current-health");
   // @HACK @SPEED! This check won't be necessary when i make components only send updates when they change!!
   if (health.toString() !== previousHealthStr) {
      healthBarElem.style.setProperty("--current-health", health.toString());
      healthBarElem.style.setProperty("--previous-health", previousHealthStr);

      // @Hacky
      healthBarElem.classList.remove("animated");
      void healthBarElem.offsetWidth;
      healthBarElem.classList.add("animated");

      // @Cleanup @Copynpaste: use a utils function for this
      healthCounterNode.data = (Math.round((health + Number.EPSILON) * 100) / 100).toString();
   }
}