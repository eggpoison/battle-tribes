import "./css/index.css";
import "./ui/MainMenu"; // From here everything should be imported
// @HACK because the whole nerdVision tree would otherwise never be imported
import "./ui/game/dev/NerdVision";
// @HACK
import "./ui/game/DeathScreen";

// So that the component arrays are all detected
import.meta.glob("./game/entity-components/**/*Component.ts", {
   eager: true
});

if (import.meta.hot) {
   import.meta.hot.accept();
}