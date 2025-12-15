export const tableCellFilterFns = {
  user: (row, columnId, filterValue) => {
    const value = row.getValue<string>(columnId)?.toLowerCase();
    return filterValue.some((v: string) => value?.toLocaleLowerCase()?.includes(v.toLowerCase()));
  },
}