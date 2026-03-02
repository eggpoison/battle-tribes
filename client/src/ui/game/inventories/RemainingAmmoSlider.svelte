<script lang="ts">
   import { AMMO_INFO_RECORD, type TurretAmmoType } from "webgl-test-shared";
   import { ItemType } from "webgl-test-shared";

   const AMMO_BG_COLOURS: Record<TurretAmmoType, string> = {
      [ItemType.wood]: "#8f5a21",
      [ItemType.rock]: "#ccc",
      [ItemType.slimeball]: "#9efa69",
      [ItemType.frostcicle]: "#7ac6f5"
   }

   interface Props {
      readonly ammoType: TurretAmmoType | null;
      readonly ammoRemaining: number;
   }

   let props: Props = $props();

   const sliderProgress = props.ammoType !== null ? props.ammoRemaining / AMMO_INFO_RECORD[props.ammoType].ammoMultiplier : 0;
</script>

      
<div class="ammo-slider-container">
   <div class="ammo-slider" style:width="{sliderProgress * 100}%" style:backgroundColor={props.ammoType !== null ? AMMO_BG_COLOURS[props.ammoType] : "#000"}>
      {#if props.ammoType !== null}
         <span class="label">{props.ammoRemaining}/{AMMO_INFO_RECORD[props.ammoType].ammoMultiplier}</span>
      {/if}
   </div>
</div>