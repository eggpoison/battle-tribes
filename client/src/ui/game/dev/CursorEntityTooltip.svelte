<script lang="ts">
   import { EntityDebugData } from "webgl-test-shared/src/client-server-types";
</script>

export let updateCursorTooltip: (debugData: EntityDebugData | null, screenPositionX: number, screenPositionY: number) => void = () => {};

const CursorTooltip = () => {
   const [debugData, setDebugData] = useState<EntityDebugData | null>(null);
   const cursorTooltipRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      updateCursorTooltip = (debugData: EntityDebugData | null, screenPositionX: number, screenPositionY: number): void => {
         setDebugData(debugData);

         if (cursorTooltipRef.current !== null) {
            cursorTooltipRef.current.style.bottom = screenPositionY + "px";
            cursorTooltipRef.current.style.left = screenPositionX + "px";
         }
      }
   }, []);

   let healthText: string | undefined;
   if (debugData !== null && typeof debugData.health !== "undefined" && typeof debugData.maxHealth !== "undefined") {
      const health = debugData.health.toFixed(2);
      const maxHealth = debugData.maxHealth.toFixed(2);
      healthText = health + "/" + maxHealth;
   }

   return typeof healthText !== "undefined" ? <div id="cursor-tooltip" ref={cursorTooltipRef}>
      <p>{healthText}</p>
   </div> : null;
}

<style>
   @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700;900&display=swap');

   #cursor-tooltip {
      position: absolute;
      z-index: 1;
      transform: translate(-50%, 50%);
      user-select: none;
      pointer-events: none;
   }

   #cursor-tooltip p {
      color: #fff;
      font-family: "Inconsolata";
      font-weight: 700;
      font-size: 1.1rem;
      text-shadow: 2px 2px #000;
      background-color: rgba(0, 0, 0, 0.3);
      white-space: pre;
      margin: 0.3rem 0 0.3rem 50%;
      user-select: none;
      pointer-events: none;
      display: table;
      transform: translateX(-50%);
   }
</style>