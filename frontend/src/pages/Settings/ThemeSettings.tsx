import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-options">
      <div
        className={`theme-option ${theme === 'morandi' ? 'active' : ''}`}
        onClick={() => setTheme('morandi')}
      >
        <div className="theme-preview morandi-preview" />
        <span>莫兰迪</span>
      </div>
      <div
        className={`theme-option ${theme === 'minimal' ? 'active' : ''}`}
        onClick={() => setTheme('minimal')}
      >
        <div className="theme-preview minimal-preview" />
        <span>极简黑白灰</span>
      </div>
    </div>
  );
}
