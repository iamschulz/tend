export type Activity = {
    title: string,
    icon: string,
    emoji: string,
}

export type Entry = {
    id: string;
    start: number;
    end: number | null;
    running: boolean;
    categoryId: string;
}

export type Category = {
    id: string;
    title: string;
    activity: Activity;
    color: string;
    entries: Entry[]; 
}

export type EntryWithCategory = Entry & {
    category: Omit<Category, 'entries'> | undefined;
};