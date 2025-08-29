export class Player {
  constructor(x, y) { this.x = x; this.y = y; }
}

export class NPC {
  constructor(x, y, text) { this.x = x; this.y = y; this.text = text; }
}

export class Decor {
  constructor(x, y, kind) { this.x = x; this.y = y; this.kind = kind; }
}
