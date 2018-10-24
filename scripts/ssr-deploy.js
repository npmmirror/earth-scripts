process.env.ENABLE_BUNDLE_ANALYZE = 'false';
process.env.IS_SERVER = 'true';
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';


const pm2 = require('pm2');
const path = require('path');
const yargs = require('yargs');
const console = require('../tools').clog.ssr;
const webpack = require('webpack');
const config = require('../server/webpack.config');
const del = require('del');

const args = process.argv.slice(2);
const env = yargs.parse(args).env;
const entry = yargs.parse(args).entry || require.resolve("../server/index.js");


console.info(`current environment: ${env}`);

let PM2_CONFIG = {};

try {
    PM2_CONFIG = require(path.resolve(__dirname, `../server/eco.${env}.js`))
} catch (e) {
    console.error(`cannot support env: ${env}`);
    console.log(e);
    process.exit(1)
}

const ssrDeploy = async () => {

    await require('./_ssr_init')();

    await require('./_ssr_set_config')(env);

    // clear
    del(path.resolve('_server/dist'));


    try {
        await startCompile({
            entry: entry
        })
    } catch (e) {
        console.log(e);
        console.log('webpack compiler error');
        process.exit(1);
    }

    startPm2();

};

ssrDeploy();



const startCompile = ({
                          entry
                      }) => {
    // compile
    return new Promise((resolve, reject) => {
        console.log('start compile...');

        webpack(
            Object.assign(config, {
                entry: {
                    main: path.resolve(entry)
                }
            }),
            (err, stats) => {
                if (err || stats.hasErrors()) {
                    reject(err);
                    // Handle errors here
                }
                // Done processing
            })
            .run((err, stats) => {

                if (err || stats.hasErrors()) {
                    reject(err);
                    // Handle errors here
                }

                console.log(stats.toString({
                    chunks: false,  // Makes the build much quieter
                    colors: true    // Shows colors in the console
                }));

                resolve()


            });
    })
}





const startPm2 = () => {
    pm2.connect(function (err) {
        console.log('pm2 connect...');

        if (err) {
            console.error(err);
            process.exit(2);
        }

        pm2.start(PM2_CONFIG,
            function (err, apps) {
                err && console.log('start pm2: ' + err);
                pm2.disconnect();   // Disconnects from PM2
                if (err) throw err
            });
    });
};