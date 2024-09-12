const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

// @Bug? are these correct?
const isEnvDevelopment = process.env.NODE_ENV === 'development';
const isEnvProduction = process.env.NODE_ENV === 'production';

const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

const getStyleLoaders = (cssOptions, preProcessor) => {
   const loaders = [
   isEnvDevelopment && require.resolve('style-loader'),
   isEnvProduction && {
      loader: MiniCssExtractPlugin.loader,
      // css is located in `static/css`, use '../../' to locate index.html folder
      // in production `paths.publicUrlOrPath` can be a relative path
      options: paths.publicUrlOrPath.startsWith('.')
         ? { publicPath: '../../' }
         : {},
   },
   {
      loader: require.resolve('css-loader'),
      options: cssOptions,
   },
   {
      // Options for PostCSS as we reference these options twice
      // Adds vendor prefixing based on your specified browser support in
      // package.json
      loader: require.resolve('postcss-loader'),
      options: {
         postcssOptions: {
         // Necessary for external CSS imports to work
         // https://github.com/facebook/create-react-app/issues/2677
         ident: 'postcss',
         config: false,
         plugins: [
            'postcss-flexbugs-fixes',
            [
               'postcss-preset-env',
               {
                  autoprefixer: {
                  flexbox: 'no-2009',
                  },
                  stage: 3,
               },
            ],
            // Adds PostCSS Normalize as the reset css with default options,
            // so that it honors browserslist config in package.json
            // which in turn let's users customize the target behavior as per their needs.
            'postcss-normalize',
         ]
         },
         sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
      },
   },
   ].filter(Boolean);
   if (preProcessor) {
   loaders.push(
      {
         loader: require.resolve('resolve-url-loader'),
         options: {
         sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
         root: paths.appSrc,
         },
      },
      {
         loader: require.resolve(preProcessor),
         options: {
         sourceMap: true,
         },
      }
   );
   }
   return loaders;
};

module.exports = {
   mode: process.env.NODE_ENV ?? "development",
   entry: "./src/index",
   module: {
      rules: [
         {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            type: 'asset',
            parser: {
               dataUrlCondition: {
               maxSize: imageInlineSizeLimit,
               },
            },
         },
         {
            test: /.tsx?$/,
            use: [
               {
                 loader: 'ts-loader',
                 options: {
                   transpileOnly: true, // Speeds up compilation
                 },
               },
             ],
            exclude: /node_modules/,
         },
         {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, "css-loader"]
         },
         // {
         //    test: /\.css$/,
         //    use: ["style-loader", "css-loader"],
         // },
         // {
         //    test: /\.css$/,
         //    exclude: /\.module\.css$/,
         //    use: getStyleLoaders({
         //       importLoaders: 1,
         //       sourceMap: isEnvProduction
         //       ? shouldUseSourceMap
         //       : isEnvDevelopment,
         //       modules: {
         //       mode: 'icss',
         //       },
         //    }),
         //    // Don't consider CSS imports dead code even if the
         //    // containing package claims to have no side effects.
         //    // Remove this when webpack adds a warning or an error for this.
         //    // See https://github.com/webpack/webpack/issues/6571
         //    // sideEffects: true,
         // },
         // "file" loader makes sure those assets get served by WebpackDevServer.
         // When you `import` an asset, you get its (virtual) filename.
         // In production, they would get copied to the `build` folder.
         // This loader doesn't use a "test" so it will catch all modules
         // that fall through the other loaders.
         {
            // Exclude `js` files to keep "css" loader working as it injects
            // its runtime that would otherwise be processed through "file" loader.
            // Also exclude `html` and `json` extensions so they get processed
            // by webpacks internal loaders.
            exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
            type: 'asset/resource',
         }
      ],
   },
   resolve: {
      alias: {
         // Battletribes alias (to match the path in tsconfig.json)
        'battletribes-shared': path.resolve(__dirname, '../shared/src'),
      },
      extensions: [".tsx", ".ts", ".js"],
   },
   output: {
      filename: "bundle.js",
      path: path.resolve(__dirname, "dist"),
   },
   plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin(
         Object.assign(
            {},
            {
               inject: true,
               template: path.resolve(__dirname, 'public/index.html'),
            },
            isEnvProduction ? {
               minify: {
               removeComments: true,
               collapseWhitespace: true,
               removeRedundantAttributes: true,
               useShortDoctype: true,
               removeEmptyAttributes: true,
               removeStyleLinkTypeAttributes: true,
               keepClosingSlash: true,
               minifyJS: true,
               minifyCSS: true,
               minifyURLs: true,
               },
            } : undefined
         )
      ),
      new MiniCssExtractPlugin({
        filename:"bundle.css"
      }),
      new ReactRefreshWebpackPlugin()
   ],
   devServer: {
     static: path.join(__dirname, "dist"),
     hot: true,
     compress: true,
     port: 3000,
   },
};