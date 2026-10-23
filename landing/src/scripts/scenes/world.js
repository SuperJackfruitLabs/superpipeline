// The one world every scene on this page is built from: a stone plinth, a belt that carries a card
// from stage to stage, the pawns that own the stages, and the gate. Boxes and a few low cylinders,
// flat-shaded, made in code. A person is a round pawn; an agent is a square one in the capability
// colour, the same split the page's pipeline draws with its owner chips.
import { BoxGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshLambertMaterial } from 'three';

const mat = (c) => new MeshLambertMaterial({ color: c, flatShading: true });

export function kit(accent) {
  const M = {
    stone: mat('#d6cdc1'), stoneTop: mat('#e4ddd3'), belt: mat('#3b3e49'), seam: mat('#4b4f5c'),
    rail: mat('#8f8b84'), person: mat('#e9dfd0'), personDark: mat('#b9ab98'), agent: mat('#3fb7a2'),
    agentDark: mat('#23806f'), visor: mat('#1d2a30'), card: mat('#f4eee2'), post: mat('#4a4650'),
    accent: mat(accent), tile: mat('#cfc6b9'),
  };

  function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
    const b = new Mesh(new BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    parent?.add(b);
    return b;
  }
  function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, parent, seg = 8) {
    const c = new Mesh(new CylinderGeometry(rt, rb, h, seg), m);
    c.position.set(x, y, z);
    c.castShadow = c.receiveShadow = true;
    parent?.add(c);
    return c;
  }

  /** A person: a round pawn standing on y = 0. */
  function person(parent) {
    const g = new Group();
    cyl(0.15, 0.17, 0.05, M.personDark, 0, 0.025, 0, g, 10);
    cyl(0.09, 0.14, 0.3, M.person, 0, 0.2, 0, g, 10);
    const head = new Mesh(new IcosahedronGeometry(0.095, 1), M.person);
    head.position.y = 0.44;
    head.castShadow = true;
    g.add(head);
    parent?.add(g);
    return g;
  }
  /** An agent: a square pawn with a visor, standing on y = 0. */
  function agent(parent) {
    const g = new Group();
    box(0.28, 0.05, 0.24, M.agentDark, 0, 0.025, 0, g);
    box(0.22, 0.26, 0.18, M.agent, 0, 0.18, 0, g);
    box(0.17, 0.13, 0.15, M.agent, 0, 0.39, 0, g);
    box(0.13, 0.035, 0.01, M.visor, 0, 0.4, 0.078, g);
    parent?.add(g);
    return g;
  }
  /** A card lying flat, its accent tab on the far edge. Its origin is its underside. */
  function card(parent) {
    const g = new Group();
    box(0.36, 0.025, 0.26, M.card, 0, 0.0125, 0, g);
    box(0.12, 0.006, 0.05, M.accent, -0.08, 0.028, -0.09, g).castShadow = false;
    parent?.add(g);
    return g;
  }
  /** A stretch of belt along x, its top at y = top, with seams across it. */
  function belt(x0, x1, top, parent, width = 0.5) {
    const len = x1 - x0, mid = (x0 + x1) / 2;
    box(len, 0.08, width, M.belt, mid, top - 0.04, 0, parent);
    box(len + 0.06, 0.1, 0.05, M.rail, mid, top - 0.03, width / 2 + 0.025, parent);
    box(len + 0.06, 0.1, 0.05, M.rail, mid, top - 0.03, -width / 2 - 0.025, parent);
    for (let x = x0 + 0.25; x < x1; x += 0.5) box(0.015, 0.004, width - 0.02, M.seam, x, top + 0.001, 0, parent).castShadow = false;
  }
  /** Two stone steps, the world's floor; returns the height of the top step. */
  function plinth(w, d, parent, z = 0) {
    box(w, 0.2, d, M.stone, 0, 0.1, z, parent);
    box(w - 0.3, 0.05, d - 0.3, M.stoneTop, 0, 0.225, z, parent);
    return 0.25;
  }
  return { M, box, cyl, person, agent, card, belt, plinth };
}
