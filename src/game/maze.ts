export function isOpenMazeTile(
  layout: readonly string[],
  position: { row: number; col: number },
): boolean {
  return position.row >= 0 &&
    position.row < layout.length &&
    position.col >= 0 &&
    position.col < layout[position.row].length &&
    layout[position.row][position.col] !== "#";
}
