const chalk = require('chalk');
const fs = require('fs')

module.exports = replaceFileName = (text) => {
    const args = text.split(" ")
    let search = args[0] ?? process.argv[3]
    search = search.replaceAll("/s", " ")
    let value = args[1] ?? process.argv[4]
    value = value.replaceAll("/s", " ")

    const options = {
        rekursif: false
    }

    console.log("Search", chalk.gray(search))
    console.log("Value", chalk.gray(value))

    if(search !== undefined && value !== undefined) {
        args.forEach((arg, idx) => {
            if(idx > 1) {
                if(arg === '-r') {
                    options.rekursif = true
                }
            }
        })
        
        const read = fs.readdirSync('./')
        if(options.rekursif) {
            if(read.length !== 0) {
                let same = read.filter(val => val.includes(search))
                if(same.length > 0) {
                    same.forEach(sa => {
                        const result = sa.replaceAll(search, value)
                        fs.renameSync(sa, result)
                        console.log("Replace: '", chalk.yellow(sa), "' to '", chalk.blue(result), "'")
                    })
                } else {
                    console.log(`Not found file with string ${search}`)
                }
            } else {
                console.log('Not found file')
            }
        } else {
            const found = read.find(val => val.includes(search))
            if(found) {
                const result = found.replaceAll(search, value)
                fs.renameSync(found, result)
                console.log("Replace: '", chalk.yellow(sa), "' to '", chalk.blue(result), "'")
            } else {
                console.log('Not found file')
            }
        }
    } else {
        console.log('Requires the search string and replace value')
    }    
}
