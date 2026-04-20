import "./css/index.css";
import "./ui/MainMenu"; // From here everything should be imported
import "./game/entity-components/components"; // So that the component arrays are all detected
// @HACK because the whole nerdVision tree would otherwise never be imported
import "./ui/game/dev/NerdVision";
// @HACK
import "./ui/game/DeathScreen";

if (import.meta.hot) {
   import.meta.hot.accept();
}