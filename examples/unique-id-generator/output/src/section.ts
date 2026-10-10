// The section contract. Each topic file exports one Section.

export interface Section {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly icon: string;
  readonly badge: string;
  readonly caption: string;
  /**
   * Draw the section into the given element. Return a cleanup function.
   * The framework calls the cleanup function when the user leaves the
   * section, so each chart is removed and no hidden chart keeps its size.
   */
  render(el: HTMLElement): void | (() => void);
}
