// "What it's like to use": the agent's question. The Build stage close up, its agent behind the
// belt and the card in front of it. A flag goes up on the card, the agent asking, and then the card
// leaves the belt for the tray in front of the person, where it waits. The scene ends there, as the
// page's card does: it is parked on you until you answer.
import { Group } from 'three';
import { kit } from './world.js';

const RISE = 0.6, PAUSE = 0.3, MOVE = 1.0;
const TRAY = [0.62, 0, 0.82];

export const question = {
  duration: RISE + PAUSE + MOVE,
  fit: { w: 4.5, h: 2.6 },
  look: [0.2, 0.35, 0.3],
  yaw: 18,
  el: 30,
  fov: 24,
  shadow: 2.4,
  lampAt: [0.6, 1.5, 1.0],
  build(accent) {
    const k = kit(accent), root = new Group();
    const floor = k.plinth(3.7, 2.6, root, 0.2), top = floor + 0.08;
    k.belt(-1.6, 1.6, top, root);
    k.agent(root).position.set(0, floor, -0.62);
    k.box(0.56, 0.02, 0.14, k.M.agent, 0, floor + 0.01, 0.42, root);
    // The person's side: a tray on the plinth and the person beside it.
    k.box(0.5, 0.04, 0.38, k.M.tile, TRAY[0], floor + 0.02, TRAY[2], root);
    k.person(root).position.set(TRAY[0] + 0.52, floor, TRAY[2] + 0.02);

    const card = k.card(root);
    card.position.set(0, top, 0);
    // The question flag on the card's near corner: a pole and a pennant, grown from the card.
    const flag = new Group();
    flag.position.set(0.14, 0.025, 0.09);
    k.box(0.018, 0.42, 0.018, k.M.post, 0, 0.21, 0, flag);
    k.box(0.18, 0.11, 0.01, k.M.accent, 0.09, 0.36, 0, flag);
    card.add(flag);

    const ease = (t) => t * t * (3 - 2 * t);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const end = [TRAY[0], floor + 0.04, TRAY[2]];
    return {
      root,
      pose(t) {
        flag.scale.y = Math.max(0.001, ease(clamp(t / RISE)));
        const u = ease(clamp((t - RISE - PAUSE) / MOVE));
        // Lifted over the belt's rail on the way to the tray.
        card.position.set(end[0] * u, top + (end[1] - top) * u + Math.sin(u * Math.PI) * 0.14, end[2] * u);
      },
    };
  },
};
