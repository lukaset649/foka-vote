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
      className="inline-flex items-center rounded-md border border-zinc-300 p-0.5 text-xs font-medium"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <span
          key={language}
          className={cn(
            'rounded px-2 py-1 uppercase transition-colors',
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
