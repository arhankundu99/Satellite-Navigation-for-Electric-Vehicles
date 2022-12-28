module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            'process.env.ROUTING_SERVICE': JSON.stringify(process.env.ROUTING_SERVICE)
        })
    ],
}