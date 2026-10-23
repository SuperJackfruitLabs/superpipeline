// "How it works": the Software delivery template as a sorting line. Six stages along a belt, each
// with its owner behind it: a person at Intake, Sign-off and Shipped, an agent at Plan, Build and
// Security review. It plays in three beats, one per step of the section:
//   0. Set up the stages: the gate's bar comes down across the belt between Sign-off and Shipped.
//   1. An agent claims the card: the card rides from Intake through the agent stages, pausing at
//      each; completing a stage is what moves it on.
//   2. You decide at the gate: the card reaches Sign-off and the bar holds it there. It stays: the
//      page says a gate holds the card until a person decides, and the scene does not decide.
import { Group } from 'three';
import { kit } from './world.js';

export const STAGES = ['human', 'capability', 'capability', 'capability', 'gate', 'human'];
const GAP = 0.86, X = (i) => (i - 2.5) * GAP;
const DROP = 0.9, LEAD = 0.25, MOVE = 0.6, DWELL = 0.4;
const B1 = DROP + LEAD + 3 * MOVE + 2 * DWELL;

export const line = {
  duration: B1 + MOVE + 0.2,
  beats: [[0, DROP], [DROP, B1], [B1, B1 + MOVE + 0.2]],
  fit: { w: 5.9, h: 2.5 },
  look: [0.15, 0.4, 0.15],
  yaw: 26,
  el: 30,
  fov: 26,
  shadow: 4.2,
  lampAt: [X(4) + 0.2, 1.5, 0.5],
  build(accent) {
    const k = kit(accent), root = new Group();
    const floor = k.plinth(5.7, 2.0, root), top = floor + 0.08;
    k.belt(X(0) - 0.35, X(5) + 0.35, top, root);
    STAGES.forEach((kind, i) => {
      // The owner stands behind the belt; a tile in front marks the stage in its owner's colour.
      const owner = kind === 'capability' ? k.agent(root) : k.person(root);
      owner.position.set(X(i), floor, -0.62);
      k.box(0.5, 0.02, 0.14, kind === 'capability' ? k.M.agent : kind === 'gate' ? k.M.accent : k.M.tile, X(i), floor + 0.01, 0.56, root);
    });
    // The gate: two posts and a bar across the belt between Sign-off and Shipped.
    const gx = (X(4) + X(5)) / 2;
    k.box(0.07, 0.62, 0.07, k.M.rail, gx, floor + 0.31, 0.4, root);
    k.box(0.07, 0.62, 0.07, k.M.rail, gx, floor + 0.31, -0.4, root);
    const bar = k.box(0.05, 0.05, 0.86, k.M.accent, gx, top + 0.18, 0, root);
    const card = k.card(root);
    card.position.set(X(0), top, 0);

    const ease = (t) => t * t * (3 - 2 * t);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    return {
      root,
      pose(t) {
        bar.position.y = top + 0.18 + (1 - ease(clamp(t / DROP))) * 0.36;
        // Four moves, Intake → Sign-off, with a pause at each agent stage in between; the last
        // one waits for the third beat.
        let x = X(0);
        for (let i = 0; i < 4; i++) {
          const s = i < 3 ? DROP + LEAD + i * (MOVE + DWELL) : B1 + 0.1;
          if (t >= s) x = X(i) + (X(i + 1) - X(i)) * ease(clamp((t - s) / MOVE));
        }
        card.position.x = x;
      },
    };
  },
};
