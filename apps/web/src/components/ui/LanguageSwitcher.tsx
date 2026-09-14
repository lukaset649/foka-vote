import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';
import { cn } from '../../lib/cn';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const activeLanguage = SUPPORTED_LANGUAGES.includes(i18n.language) ? i18n.language : 'pl';

  const toggleLanguage = () => {
    const nextLanguage = SUPPORTED_LANGUAGES.find((language) => language !== activeLanguage);
    if (nextLanguage) void i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex h-7 cursor-pointer items-center gap-0.5 rounded-md border border-zinc-300 p-0.5 text-xs font-medium sm:h-10 sm:items-stretch sm:text-sm"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <span
          key={language}
          className={cn(
            'flex items-center justify-center rounded px-2 py-1 uppercase transition-colors sm:px-3 sm:py-0',
            activeLanguage === language ? 'bg-indigo-600 text-white' : 'text-zinc-600',
          )}
        >
          {language}
        </span>
      ))}
    </button>
  );
};

export default LanguageSwitcher;
