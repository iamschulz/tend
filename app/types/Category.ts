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
    hidden: boolean;
}

export type EntryWithCategory = Entry & {
    category: Category | undefined;
};

export type CategoryData = {
  title: string;
  color: string;
  activity: Activity;
};

/** Category bundled with its entries, used for import/export JSON format */
export type CategoryWithEntries = Category & {
    entries: Entry[];
};
