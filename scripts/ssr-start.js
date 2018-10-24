process.env.IS_SERVER = 'true';
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const del = require('del');
const path = require('path');
const yargs = require('yargs');
const webpack = require('webpack');
const nodemon = require('nodemon');
const config = require('../server/webpack.config');
const console = require('../tools').clog.ssr;


console.info(`current environment: development`);

const args = process.argv.slice(2);
const entry = yargs.parse(args).entry || require.resolve("../server/index.js");


/**
 * 0. init
 * 1. webpack watch
 * 2. nodemon start server
 */

const ssrStart = async () => {

    await require('./_ssr_init')();

    await require('./_ssr_set_config')('development');

    // clear
    del(path.resolve('_server/dist'));


    try {
        await ssrWatch({
            entry: entry
        });
    } catch (e) {
        console.log(e);
        console.log('watch fail');
        return;
    }

    nodemonStart()

};

ssrStart();

const ssrWatch = ({
                      entry
                  }) => {
    return new Promise((resolve, reject) => {

        const compiler = webpack(
            Object.assign(config, {
                entry: {
                    main: path.resolve(entry)
                }
            }),
            (err, stats) => {
                if (err || stats.hasErrors()) {
                    err && console.log(err);
                    stats.hasErrors() && console.log(stats.toJson().errors)
                    console.log('webpack compiler error');
                    process.exit(1);
                    // Handle errors here
                }
                // Done processing
            }
        );

        compiler.watch({
            // Example watchOptions
            aggregateTimeout: 300,
            poll: true
        }, (err, stats) => {
            // todo: 不输出信息
            // Print watch/build result here...
            if (err) {
                console.error(err);
                reject(err);
                return;
            }


            const info = stats.toJson();


            if (stats.hasErrors()) {
                console.error(info.errors);
            }

            if (stats.hasWarnings()) {
                console.warn(info.warnings);
            }


            resolve(true);

        });
    })
};

module.exports = ssrWatch;


const nodemonStart = () => {
    nodemon({
        script: path.resolve('_server/dist/main.generated.js'),
        ext: 'js json',
        "env": {
            "NODE_ENV": "development"
        },
        watch: path.resolve('_server/dist/main.generated.js')
    });

    nodemon.on('start', function () {
        console.log('=== App has started === \n');
    }).on('quit', function () {
        console.log('App has quit');
        process.exit();
    }).on('restart', function (files) {
        // console.log('App restarted due to: ', files);
    });
}