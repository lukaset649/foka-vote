import { useTranslation } from 'react-i18next';
import Button from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | 'gap';

// Always shows the first, the last and the neighbours of the current page; a single hidden
// page is shown as its number, since an ellipsis would take the same space.
function pageItems(page: number, totalPages: number): PageItem[] {
  const visible = [1, page - 1, page, page + 1, totalPages]
    .filter((value) => value >= 1 && value <= totalPages)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  for (const value of visible) {
    const previous = items[items.length - 1];
    if (typeof previous === 'number' && value - previous === 2) {
      items.push(previous + 1);
    } else if (typeof previous === 'number' && value - previous > 2) {
      items.push('gap');
    }
    items.push(value);
  }
  return items;
}

const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={t('components.pagination.label')} className="mt-4">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('components.pagination.previous')}
            title={t('components.pagination.previous')}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </Button>
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className="px-1 text-zinc-400" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                type="button"
                variant={item === page ? 'primary' : 'secondary'}
                size="icon"
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('components.pagination.page', { page: item })}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </li>
          ),
        )}
        <li>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('components.pagination.next')}
            title={t('components.pagination.next')}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </Button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
