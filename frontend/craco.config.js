module.exports = {
    webpack: {
        configure: {
            // See https://github.com/webpack/webpack/issues/6725
            module: {
                rules: [{
                    test: /\.wasm$/,
                    type: 'javascript/auto',
                }]
            },
            resolve: {
                fallback: {
                    fs: false,
                    path: false,
                    crypto: false,
                }
            }
        }
    },
    devServer: {
        client: {
            overlay: {
                runtimeErrors: (error) => {
                    const ignoreErrors = [
                        "ResizeObserver loop limit exceeded",
                        "ResizeObserver loop completed with undelivered notifications.",
                    ];
                    if (ignoreErrors.includes(error.message)) {
                        return false;
                    }
                    return true;
                },
            },
        },
    }
};