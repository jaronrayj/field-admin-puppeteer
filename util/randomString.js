module.exports = function (length = 8) {
    return Math.random().toString(20).substr(2, length)
}