// The section contract. Each topic file exports one Section.

export interface Section {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  /** A Bootstrap Icons class, for example bi-bullseye. */
  readonly icon: string;
  readonly badge: string;
  readonly caption: string;
  /**
   * Draw the section into the given element. Return a cleanup function. The
   * shell calls it when the user leaves the section, so each chart is removed.
   */
  render(el: HTMLElement): void | (() => void);
}
