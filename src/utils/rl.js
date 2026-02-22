const readline = require("readline")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const askQuestion = (ask) => {
    return new Promise((resolve) => {
        rl.question(ask, (answer) => {
            resolve(answer)
        })
    })
}

module.exports = { askQuestion, rl }