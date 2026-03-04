export type Entry = {
    id: string;
    start: number;
    end: number | null;
    running: boolean;
    categoryId: string;
    comment: string;
}
