import antfu from '@antfu/eslint-config'

// ---- P1-4 模块调用方向冻结的机械守卫（决策记录：P1-4 模块接口冻结.md）----
// 分层从低到高：types/constants → utils → services → stores/composables → components/pages/router，
// 只许向下依赖。ts-fsrs 只允许 utils/fsrs 适配层（及其测试）导入，业务代码经 utils/fsrs 间接使用。
// flat config 中后块覆盖前块，因此每个层块都必须重复声明 ts-fsrs 禁令，
// 否则该层块对 no-restricted-imports 的整体覆盖会把 ts-fsrs 禁令一并抹掉。

const LAYER_MSG = '违反 P1-4 模块调用方向冻结（只许向下依赖），见 P1-4 模块接口冻结.md'
const PKG_MSG = '该层不允许依赖此包，见 P1-4 模块接口冻结.md'
const TSFSRS_MSG = 'ts-fsrs 只允许在 src/utils/fsrs.ts 适配层及其测试导入（P1-2 冻结边界），业务代码经 utils/fsrs 间接使用'

function layerRule(forbiddenLayers: string[] = [], forbiddenPkgs: string[] = [], allowTsFsrs = false) {
  const patterns = [
    ...forbiddenLayers.map(layer => ({ group: [`**/${layer}`, `**/${layer}/**`], message: LAYER_MSG })),
    ...forbiddenPkgs.map(pkg => ({ group: [pkg, `${pkg}/*`], message: PKG_MSG })),
  ]
  if (!allowTsFsrs)
    patterns.push({ group: ['ts-fsrs', 'ts-fsrs/*'], message: TSFSRS_MSG })
  return ['error', { patterns }]
}

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: true,
    // 设计文档（*.md）由作者手写维护，不参与 lint/自动格式化
    ignores: ['**/*.md'],
  },
  {
    rules: {
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-exports': 'off',
      'perfectionist/sort-named-exports': 'off',
    },
  },
  {
    // tokens.less / var.less 是手写维护的设计数值源与 Vant 映射层，
    // 注释对齐、hex 大写与 设计系统.md 保持一致，不参与 prettier 自动格式化
    files: ['src/styles/tokens.less', 'src/styles/var.less'],
    rules: {
      'format/prettier': 'off',
    },
  },
  {
    // 自动生成的声明文件，不手写、不参与规则检查
    ignores: [
      'src/types/*.d.ts',
    ],
  },
  {
    // P0 使用 Node 内置测试运行器，避免为纯函数测试引入额外依赖
    files: ['**/*.test.{js,mjs,cjs,ts,mts,cts}'],
    rules: {
      'test/no-import-node-test': 'off',
    },
  },
  {
    // 兜底：覆盖无独立层块的文件（pages / components / router 等），ts-fsrs 全局禁令
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/utils/fsrs.ts', 'src/utils/fsrs.test.ts'],
    rules: {
      'no-restricted-imports': layerRule(),
    },
  },
  {
    // types：地基层，仅允许引用 types 与 constants（type-only 互引）
    files: ['src/types/**'],
    rules: {
      'no-restricted-imports': layerRule(['utils', 'services', 'stores', 'composables', 'pages', 'components', 'router']),
    },
  },
  {
    // constants：与 types 同层，仅允许引用 types（type-only）
    files: ['src/constants/**'],
    rules: {
      'no-restricted-imports': layerRule(['utils', 'services', 'stores', 'composables', 'pages', 'components', 'router']),
    },
  },
  {
    // utils：纯函数层，禁止框架依赖与上层
    files: ['src/utils/**'],
    rules: {
      'no-restricted-imports': layerRule(['services', 'stores', 'composables', 'pages', 'components', 'router'], ['vue', 'pinia', 'vant', '@vue/*']),
    },
  },
  {
    // utils/fsrs 适配层白名单：保持 utils 层其余禁令，放行 ts-fsrs
    files: ['src/utils/fsrs.ts', 'src/utils/fsrs.test.ts'],
    rules: {
      'no-restricted-imports': layerRule(['services', 'stores', 'composables', 'pages', 'components', 'router'], ['vue', 'pinia', 'vant', '@vue/*'], true),
    },
  },
  {
    // services：数据访问层
    files: ['src/services/**'],
    rules: {
      'no-restricted-imports': layerRule(['stores', 'composables', 'pages', 'components', 'router']),
    },
  },
  {
    // stores：全局状态层
    files: ['src/stores/**'],
    rules: {
      'no-restricted-imports': layerRule(['composables', 'pages', 'components', 'router']),
    },
  },
  {
    // composables：组合逻辑层，允许使用 stores
    files: ['src/composables/**'],
    rules: {
      'no-restricted-imports': layerRule(['pages', 'components', 'router']),
    },
  },
)
