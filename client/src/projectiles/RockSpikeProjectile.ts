import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import Board from "../Board";
import { createRockParticle } from "../particles";
import Entity from "../Entity";
import { randFloat, randInt } from "battletribes-shared/utils";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RockSpikeComponentArray } from "../entity-components/server-components/RockSpikeComponent";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class RockSpikeProjectile extends Entity {
}

export default RockSpikeProjectile;