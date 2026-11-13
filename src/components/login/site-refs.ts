// The elements the stage moves by hand. The two drawings that hold them are rendered once
// and never again, so React never fights the attributes and transforms written here. Each
// element registers itself from a ref callback; nothing is looked up in the document.

export class SiteRefs {
  blocks: (SVGGElement | null)[] = [];
  joints: (SVGPathElement | null)[] = [];
  strings: (SVGGElement | null)[] = [];
  stringInner: (SVGGElement | null)[] = [];
  pins: (SVGRectElement | null)[] = [];
  dust: (SVGRectElement | null)[] = [];
  leaves: (SVGGElement | null)[] = [];
  door: SVGRectElement | null = null;
  overlay: SVGSVGElement | null = null;
  skyline: SVGGElement | null = null;
  crane: SVGGElement | null = null;
  trolley: SVGGElement | null = null;
  hook: SVGGElement | null = null;
  cable: SVGLineElement | null = null;
  hookHead: SVGGElement | null = null;
  carried: SVGGElement | null = null;
  pallet: SVGGElement | null = null;
  bags: (SVGGElement | null)[] = [];

  block(i: number) {
    return (el: SVGGElement | null) => {
      this.blocks[i] = el;
    };
  }
  joint(i: number) {
    return (el: SVGPathElement | null) => {
      this.joints[i] = el;
    };
  }
  string(i: number) {
    return (el: SVGGElement | null) => {
      this.strings[i] = el;
    };
  }
  stringIn(i: number) {
    return (el: SVGGElement | null) => {
      this.stringInner[i] = el;
    };
  }
  pin(i: number) {
    return (el: SVGRectElement | null) => {
      this.pins[i] = el;
    };
  }
  mote(i: number) {
    return (el: SVGRectElement | null) => {
      this.dust[i] = el;
    };
  }
  leaf(i: number) {
    return (el: SVGGElement | null) => {
      this.leaves[i] = el;
    };
  }
  bag(i: number) {
    return (el: SVGGElement | null) => {
      this.bags[i] = el;
    };
  }
  set<K extends "door" | "overlay" | "skyline" | "crane" | "trolley" | "hook" | "cable" | "hookHead" | "carried" | "pallet">(
    key: K,
  ) {
    return (el: SiteRefs[K]) => {
      (this as SiteRefs)[key] = el;
    };
  }
}
