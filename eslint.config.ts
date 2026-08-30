import antfu from '@antfu/eslint-config'

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
)
