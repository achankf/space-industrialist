
export function list<ValT>(data: Iterable<[ValT, string]>, id?: string | number) {
    const ret = $("<select>")
        .append($("<option selected disabled hidden>"));

    if (id !== undefined) {
        ret.attr("id", id);
    }

    return ret.append(...Array
        .from(data)
        .map(([val, text]) =>
            $("<option>")
                .attr("value", val.toString())
                .text(text)));
}

export const enum SortOrder {
    Increasing,
    Decreasing,
}

export class DrawTable<T> {

    private table = $("<table>");
    private lessThan: ((a: T, b: T) => number) | undefined;
    private sortOrder = SortOrder.Increasing;

    constructor(
        private columnHeader: Array<[string, ((a: T, b: T) => number) | undefined]>,
        private refresh: () => void,
    ) {
        if (columnHeader.length < 1) {
            throw new Error("table should have at least 1 column");
        }
        [, this.lessThan] = columnHeader[0];

        this.table
            .empty()
            .append($("<tr>").append(...this.columnHeader
                .map(([name, sortTarget]) => $("<th>")
                    .text(name)
                    .click(() => {
                        this.lessThan = sortTarget;
                        this.sortOrder = this.sortOrder === SortOrder.Increasing ?
                            SortOrder.Decreasing :
                            SortOrder.Increasing;
                        this.refresh();
                    }))));
    }

    public $getTable() {
        return this.table;
    }

    public render(
        allData: T[],
        makeRowData: (data: T) => Array<(number | string | boolean)>,
    ) {
        if (this.lessThan !== undefined) {
            const lessThan = this.lessThan;
            allData
                .sort((a, b) => {
                    const ord = lessThan(a, b);
                    return this.sortOrder === SortOrder.Increasing ? ord : -1 * ord;
                });
        }

        // remove everything except the header
        this.table.children().slice(1).remove();

        return this.table
            .append(...allData
                .map((data) => $("<tr>")
                    .append(...makeRowData(data)
                        .map((colData) => $("<td>").html(colData.toString())))));
    }
}
