export const tableCellFilterFns = {
  filter: (
    row: { getValue: <T = unknown>(columnId: string) => T },
    columnId: string,
    filterValue: string[]
  ): boolean => {
    const value = String(row.getValue(columnId) ?? '').toLowerCase();
    return filterValue.some((v: string) => value.includes(v.toLowerCase()));
  },
};