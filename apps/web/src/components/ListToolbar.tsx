import { useTranslation } from 'react-i18next';
import { MAX_LIST_SEARCH_LENGTH } from '@foka-vote/shared';
import type { ListSortOption } from '../lib/useListSearchParams';
import { LIST_SORT_OPTIONS } from '../lib/useListSearchParams';
import Input from './ui/Input';
import Select from './ui/Select';

interface ListToolbarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  sortOption: ListSortOption;
  onSortOptionChange: (option: ListSortOption) => void;
}

const ListToolbar = ({
  searchInput,
  onSearchInputChange,
  sortOption,
  onSortOptionChange,
}: ListToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <i
          className="bi bi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchInput}
          maxLength={MAX_LIST_SEARCH_LENGTH}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder={t('components.listToolbar.searchPlaceholder')}
          aria-label={t('components.listToolbar.searchPlaceholder')}
          className="pl-9"
        />
      </div>
      <Select
        value={sortOption}
        onChange={(event) => onSortOptionChange(event.target.value as ListSortOption)}
        aria-label={t('components.listToolbar.sortLabel')}
        className="sm:w-48"
      >
        {LIST_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`components.listToolbar.sort.${option}`)}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default ListToolbar;
