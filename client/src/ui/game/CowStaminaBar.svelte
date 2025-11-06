<script lang="ts">
   import { playerInstance } from "../../game/player";
   import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
   import { CowComponentArray } from "../../game/entity-components/server-components/CowComponent";
   import EnergyBlobImage from "src/images/miscellaneous/energy-blob.png";

   const MAX_STAMINA = 15;
</script>

{#if playerInstance !== null}
   {@const playerTransformComponent = TransformComponentArray.getComponent(playerInstance)}
   {@const playerHitbox = playerTransformComponent.hitboxes[0]}
   {@const rootEntity = playerHitbox.rootEntity}
   {@const cowComponent = CowComponentArray.getComponent(rootEntity)}

   {#if cowComponent !== null}
      <div id="cow-stamina-bar">
         <img class="energy-blob" src={EnergyBlobImage} alt="" />
         <div class="stamina-slider" style:width="{cowComponent.stamina / MAX_STAMINA * 100}%"></div>
      </div>
   {/if}
{/if}