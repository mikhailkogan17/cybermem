import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // Disable false-positive for sessionStorage reads in useEffect
      'react-hooks/set-state-in-effect': 'off',
      // Disable for shadcn/ui components that use Math.random() in useMemo
      'react-hooks/purity': 'off',
    },
  },
];

export default eslintConfig;
