export interface StudyArticleProps {
  id: string;
  title: string;
  url: string;
  bookId?: string;
  section: string;
  lastSyncedAt: string;
}

export class StudyArticle {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly bookId?: string;
  readonly section: string;
  readonly lastSyncedAt: string;

  constructor(props: StudyArticleProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('StudyArticle id cannot be empty');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('StudyArticle title cannot be empty');
    }
    if (!props.url || props.url.trim() === '') {
      throw new Error('StudyArticle url cannot be empty');
    }
    if (!props.section || props.section.trim() === '') {
      throw new Error('StudyArticle section cannot be empty');
    }
    if (!props.lastSyncedAt || props.lastSyncedAt.trim() === '') {
      throw new Error('StudyArticle lastSyncedAt cannot be empty');
    }

    this.id = props.id.trim();
    this.title = props.title.trim();
    this.url = props.url.trim();
    this.bookId = props.bookId ? props.bookId.trim() : undefined;
    this.section = props.section.trim();
    this.lastSyncedAt = props.lastSyncedAt.trim();

    Object.freeze(this);
  }
}
