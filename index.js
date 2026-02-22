#!/usr/bin/env node
const mainArg = process.argv[2]
const { anime } = require("./src/command/anime.js");
const chalk = require("chalk");
const { rl } = require("./src/utils/rl.js");

// Header
console.log(chalk.gray("-".repeat(37)))
console.log(chalk.gray("| "), chalk.red(" 🚀Welcome homeServer client🚀 "), chalk.gray(" |"))
console.log(chalk.gray("-".repeat(37)))

if(mainArg === 'anime') {    
    anime()
} else {
    console.log("Command-command")
    console.log("1. anime")
    rl.close()
}