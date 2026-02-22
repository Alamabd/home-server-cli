const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const db = require("../utils/db")
const chalk = require("chalk")
const replaceFileName = require("./replaceFileName")
const { spawn } = require('child_process')
const conf = require("../../conf")
const { askQuestion, rl } = require("../utils/rl")


async function addToDb() {
    const data = fs.readFileSync("./anime.json", {
        encoding: "utf-8"
    })
    console.log(chalk.red("Insert Anime To DABATASE"))
    console.log("Checking: ", chalk.gray("anime.json file"))
    if(!data) {
      console.log("Anime details not found")
      return null
    } else {
      console.log("Anime details oke")
    }

    const anime = JSON.parse(data)
    console.log("Insert: ", chalk.gray(anime.title))

    const eps = anime.episodes

    const animeQuery = `
    INSERT INTO anime 
    (title, japaneseTitle, score, producer, type, status, totalEpisodes, duration, releaseDate, studio, genres)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const values = [
        anime.title,
        anime.japaneseTitle,
        anime.score,
        anime.producer,
        anime.type,
        anime.status,
        anime.totalEpisodes,
        anime.duration,
        anime.releaseDate,
        anime.studio,
        anime.genres.join(", ")
    ]

    try {
      const [result] = await db.query(animeQuery, values)
      const animeId = result.insertId
      console.log("Id: " + animeId)
      console.log("Succes Insert Anime 🚀")

      if(animeId) {
        if(!eps || eps.length === 0) {
          console.log("Anime eps not found")
          return null
        } else {
          eps.map(val => {
            console.log(val.number, ". ", chalk.gray(val.url))
          })
        }

        const values = anime.episodes.map(ep => [
            animeId,
            ep.number,
            ep.url
        ])
        
        await db.query(
            "INSERT INTO animeeps (anime_id, number, url) VALUES ?",
            [values]
        )
        console.log("Succes Insert Episode 🚀")
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        console.log("Data already exists (duplicate entry)")
      } else {
        console.log(error.message)
      }
    } finally {
      db.end()
      rl.close()
    }
}

function renderProgress(percent) {
  const width = 30  
  const filled = Math.round((percent / 100) * width)  
  const bar = '█'.repeat(filled) + '-'.repeat(width - filled) 
  process.stdout.write(`\r[${bar}] ${percent.toFixed(1)}%`) 
}

function sendFileWithRsync(host, folderServer) {
  const source = './' 
  const destination = `${conf.user}@${host}:${conf.destination}anime/${folderServer}`

  console.log("Host : ", chalk.gray(host))
  console.log("from : ", chalk.gray(source))
  console.log("to   : ", chalk.gray(destination))

  const rsync = spawn('rsync', [
    '-az',
    '--info=progress2',
    '--chown=www-data:www-data',
    '--chmod=D775,F664',
    source,
    destination
  ])

  rsync.stdout.on('data', (data) => {
    const output = data.toString()  

    // Saerch %
    const match = output.match(/(\d+)%/)  
    if (match) {
      const percent = parseFloat(match[1])  
      renderProgress(percent) 
    }
  })  

  rsync.stderr.on('data', (data) => {
    console.error('\nError:', data.toString())  
  })  

  rsync.on('close', (code) => {
    if (code === 0) {
      renderProgress(100) 
      console.log('\nUpload success 🚀')  
      process.exit(0) 
    } else {
      console.log(`\nRsync exited with code ${code}`) 
      process.exit(code || 1) 
    }
  })  
}

async function sendToServer() {  
  const host = conf.host

  console.log(chalk.gray("-".repeat(31)))
  console.log(chalk.red("Cek File: anime.json..."))
  const data = fs.readFileSync("./anime.json", {
    encoding: "utf-8"
  })
  if(!data) {
    console.log("Anime details not found")
    return null
  }

  console.log(chalk.gray("-".repeat(31)))
  console.log(chalk.red("Send anime.json to db server..."))

  try {
    const request = await fetch(`http://${host}:3000/anime`, {
        method: "POST",
        body: data,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    
    console.log("Status: ", chalk.gray(request.status))
    const response = await request.json()
  
    if(request.status === 409) {
        console.log("Error: ", chalk.gray(response.message))
        const ask = await askQuestion("Tetap kirim berkas files(y/t)? ")
        if(ask.toLowerCase() !== "y") {
            throw new Error(response.message)
        }
    }
  
    console.log("Message: ", chalk.gray(response.message))
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("List file..."))
    const anime = JSON.parse(data)
  
    fs.readdir("./", (err, file) => {
      file.forEach((val, idx) => {
        console.log(idx+1, ". ", chalk.gray(val))
      })
      if(file.length === 0) {
        console.log("File: ", chalk.gray("Kosong"))
        rl.close
        return null
      }
      console.log(chalk.gray("-".repeat(31)))
      console.log(chalk.red("Prepare..."))
  
      if(host) {
        sendFileWithRsync(host, anime.title.replaceAll(" ", ""))
      } else {
        console.log("Please cek conf.js")
        rl.close()
      }
    })
  } catch (error) {
    console.log("Error: ", chalk.gray(error.message))
    rl.close()
  }
}

function reWriteAnimeWithEps(episodes) {
  // Cek anime.json
  console.log(chalk.gray("-".repeat(31)))
  console.log(chalk.red("Cek File: anime.json..."))
  const data = fs.readFileSync("./anime.json", {
    encoding: "utf-8"
  })
  if(!data) {
    console.log("Anime details not found")
    return null
  }
  const anime = JSON.parse(data)
  anime.episodes = episodes
  console.log("Add: ", chalk.gray("episodes to anime file"))
  
  // Rewrite file
  console.log(chalk.gray("-".repeat(31)))
  console.log(chalk.red("Rewrite File: anime.json..."))
  fs.writeFileSync("./anime.json", JSON.stringify(anime, null, 2), {
    encoding: "utf-8",
  })
  console.log("Rewrite: ", chalk.gray("success"))

  console.log(chalk.gray("-".repeat(31)))
  console.log(chalk.red("Resutl🔥..."))
  console.log(anime)
}

async function generateEps(recomendedName="titleAnimeName") {
    let episodes= []
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("Cek File In This Directory..."))
    const file = fs.readdirSync("./")
    const video = file.filter((prev) => prev.includes(".mp4"))
    video.forEach((val, idx) => {
        episodes.push({
            number: idx+1,
            url: val
        })
    })
    file.forEach((val, idx) => {
        console.log(idx+1, ". ", chalk.gray(val))
    })

    if(episodes.length === 0) {
        console.log("No mp4/video files")
        rl.close()
        return null
    }

    // Rename file
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("Rename files"))
    console.log("Recomended: ", chalk.gray(recomendedName + "_1.mp4"))
    const answerR = await askQuestion("Rename files(y/t) [/s=spasi]? ")
    if(answerR.toLowerCase() !== "y") {
        return episodes
    }
    
    let continueRen = true
    
    while(continueRen) {
        const answerEx = await askQuestion("[search] [value] -r(auto) ? ")
        replaceFileName(answerEx + " -r")
        const answerLop = await askQuestion("Next Rename(y/t)? ")
        if(answerLop.toLowerCase() !== "y" ) {
            continueRen = false
        }
    }

    console.log("Wait 3S: ", chalk.gray("Wait for changes files"))
    const newEpisodes = new Promise((resolve) => {
        setTimeout(() => {
            const newEps = []
            const newFile = fs.readdirSync("./")
            const newVideo = newFile.filter((prev) => prev.includes(".mp4"))
            newVideo.forEach((val, idx) => {
                newEps.push({
                    number: idx+1,
                    url: val
                })
            })
            resolve(newEps)
        }, 3000) 
    })
    return await newEpisodes
}

async function downloadImg(url, name) {
  try {
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("Download IMG File.."))
    console.log("Get From: ", chalk.gray(url))
    const ext = ".jpg"
    const filePath = "./" + name + ext

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    })

    const writer = fs.createWriteStream(filePath)

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("Downloaded: ", chalk.gray(filePath))
        resolve()
      })
      writer.on("error", reject)
      response.data.on("error", (err) => {
        reject(err)
      })
    })

  } catch (err) {
    console.error("Download error:", err.message)
  }
}


async function scrapeOtakudesu(link) {
  let result = {
    url: link,
    title: "",
    japaneseTitle: "",
    score: 0,
    producer: "",
    type: "",
    status: "",
    totalEpisodes: 0,
    duration: "",
    releaseDate: "",
    studio: "",
    genres: [],
    episodes: []
  }
  const keys = ["title", "japaneseTitle", "score", "producer", "type", "status", "totalEpisodes", "duration", "releaseDate", "studio", "genres"]
  const labels = ["Judul: ", "Japanese: ", "Skor: ", "Produser: ", "Tipe: ", "Status: ", "Total Episode: ", "Durasi: ", "Tanggal Rilis: ", "Studio: ", "Genre: "]

  try {
    // Request from otakudesu
    console.log(chalk.red("Request..."))
    console.log("Get From: ", chalk.gray(link))
    const { data } = await axios.get(link, {
    headers: {
        "User-Agent": "Mozilla/5.0"
    }
    })

    const $ = cheerio.load(data)

    // Get data anime
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("Get Data..."))
    $(".infozin .infozingle p").each((i, el) => {
        const txt = $(el).text()
        if (i <= 10) {
            let value = txt.replace(labels[i], "")
            console.log(keys[i], ": ", chalk.gray(value))
            if (keys[i] === "genres") {
                result[keys[i]] = value.split(", ")
            } else {
                result[keys[i]] = value
            }
        }
    })

    // Generate file data anime
    console.log(chalk.gray("-".repeat(31)))
    console.log(chalk.red("Generate File.."))
    fs.writeFileSync("./anime.json", JSON.stringify(result, null, 2), {
        encoding: "utf-8",
    })
    console.log("File: ", chalk.gray("anime.json success"))

    if(result) {
        // Download img
        const imgSrc = $(".fotoanime img").attr("src")
        await downloadImg(imgSrc, result.title)
        // Generate Episodes
        console.log(chalk.gray("-".repeat(31)))
        const answerGen = await askQuestion("Generate episode now(y/t)? ")
        if(answerGen === "y" || answerGen === "Y") {
        const episodes = await generateEps(result.title.replaceAll(" ", ""))
        reWriteAnimeWithEps(episodes)
        const answerSe = await askQuestion("Send to server(y/t)? ")
        if(answerSe === "y" || answerSe === "Y") {
            sendToServer()
        } else {
            rl.close()
        }
        } else {
            rl.close()
            return null
        }
    }
  } catch (error) {
    result = null
    console.error("Error:", error.message)
  } finally {
    return result
  }
}

async function anime() {
    const secondArg = process.argv[3]
    if(secondArg === 'otakudesu') {
        const link = process.argv[4]
        if(link) {
            scrapeOtakudesu(link)
        } else {
            console.log("Link no found")
        }
    } else if(secondArg === "geneps") {
        const episodes = await generateEps()
        console.log("alert: ", episodes)
        reWriteAnimeWithEps(episodes)
        rl.close()
    } else if(secondArg === "addb") {
        addToDb()
    } else if(secondArg === "send") {
        sendToServer()
    } else {
        console.log(chalk.bgBlue.white("Welcome Anime In Homeserver"))
        console.log("Command")
        console.log("1. otakudesu [link] - for scrape & generate")
        console.log("2. geneps - add eps with mp4 file in dir")
        console.log("Command Client")
        console.log("1. send - send all file to server")
        console.log("Command Server")
        console.log("1. addb - add to db")
        console.log(chalk.red("Please use command in anime directory with mp4 files"))
        rl.close()
    }
}

module.exports = {
  anime
}