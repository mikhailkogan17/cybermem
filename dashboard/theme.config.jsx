

const themeConfig = {
  logo: (
    <div className="flex items-center gap-2 font-bold text-xl">
      <span className="text-emerald-400">Ф</span>
      <span className="text-white">CyberMem</span>
    </div>
  ),
  project: {
    link: 'https://github.com/mikhailkogan/cybermem',
  },
  docsRepositoryBase: 'https://github.com/mikhailkogan/cybermem/blob/main/dashboard',
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} ©{' '}
        <a href="https://cybermem.io" target="_blank">
          CyberMem
        </a>
        .
      </span>
    ),
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – CyberMem',
    };
  },
  primaryHue: 150, // Emerald-ish
  primarySaturation: 50,

  // Customizing to match the glassmorphism dark theme
  backgroundColor: {
    dark: '#0a0a0a', // Adapting to clean dark
    light: '#ffffff'
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  }
};

export default themeConfig;
