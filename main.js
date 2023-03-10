const {
  BufferJSON,
  WA_DEFAULT_EPHEMERAL,
  generateWAMessageFromContent,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  areJidsSameUser,
  getContentType,
  downloadMediaMessage,
  downloadContentFromMessage
} = require('@adiwajshing/baileys')
const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const path = require("path");
const { tiktokdl, tiktokdlv2 } = require('@bochilteam/scraper');

const {
  Configuration,
  OpenAIApi
} = require("openai")
const setting = require('./key.json')
const speed = require('performance-now')
const { performance } = require('perf_hooks')
const { sizeFormatter } = require('human-readable')
const os = require("os");

const runtime = function(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor(seconds % (3600 * 24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

// for bot stats
const used = process.memoryUsage()
const cpus = os.cpus().map(cpu => {
  cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0)
  return cpu
})
const cpu = cpus.reduce((last, cpu, _, { length }) => {
  last.total += cpu.total
  last.speed += cpu.speed / length
  last.times.user += cpu.times.user
	last.times.nice += cpu.times.nice
  last.times.sys += cpu.times.sys
	last.times.idle += cpu.times.idle
	last.times.irq += cpu.times.irq
	return last
}, {
  speed: 0,
	total: 0,
	times: {
	  user: 0,
	  nice: 0,
	  sys: 0,
	  idle: 0,
	  irq: 0
  }
})

const isUrl = (url) => { 
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi')) 
}

const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`
})

module.exports = sansekai = async (client, m, chatUpdate, store) => {
  try {
    var body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
    var prefix = /^[Â°â€¢Ï€Ã·Ã—Â¶âˆ†Â£Â¢â‚¬Â¥Â®â„¢âœ“=|~!?@#%^var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/"
    const isCmd2 = body.startsWith(prefix)
    const command = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase()
    const anu = ["6285691186765@s.whatsapp.net","120363023332087126@g.us","6283871644377@s.whatsapp.net","120363028398293096@g.us"]
    const itsAnu = anu.includes(m.chat)
    var budy = (typeof m.text == 'string' ? m.text : '')
    const args = body.trim().split(/ +/).slice(1)
    const pushname = m.pushName || "No Name"
    const botNumber = await client.decodeJid(client.user.id)
    const itsMe = m.sender == botNumber ? true : false
    let text = q = args.join(" ")
    const arg = budy.trim().substring(budy.indexOf(' ') + 1)
    const from = m.chat
    const reply = m.reply
    const sender = m.sender
    const mek = chatUpdate.messages[0]
    const key = {
      remoteJid: m.key.remoteJid,
      participant: m.key.participant,
      id: m.key.id
    }
    const color = (text, color) => {
      return !color ? chalk.green(text) : chalk.keyword(color)(text)
    }
    // Group
    const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch(e => {}) : ''
    const groupName = m.isGroup ? groupMetadata.subject : ''
    // Push Message To Console
    let argsLog = (budy.length > 30) ? `${q.substring(0, 30)}...` : budy
    // Push Message To Console && Auto Read
    if (argsLog && !isCmd2) {
      console.log(chalk.black(chalk.bgWhite('[ MSG ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
    } else if (argsLog && isCmd2) {
      console.log(chalk.black(chalk.bgWhite('[ CMD ]')), color(command, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
    }
    
    if (itsMe && isCmd2 && command === "ping") {
      let timestamp = speed()
      let latensi = speed() - timestamp
      let neww = performance.now()
      let respon = `
Kecepatan Respon ${latensi.toFixed(4)} _Second_ \n ${neww - neww} _miliseconds_\n\nRuntime : ${runtime(process.uptime())}
💻 Info Server
RAM: ${formatp(os.totalmem() - os.freemem())} / ${formatp(os.totalmem())}
_NodeJS Memory Usaage_
${Object.keys(used).map((key, _, arr) => `${key.padEnd(Math.max(...arr.map(v=>v.length)),' ')}: ${formatp(used[key])}`).join('\n')}
${cpus[0] ? `_Total CPU Usage_
${cpus[0].model.trim()} (${cpu.speed} MHZ)\n${Object.keys(cpu.times).map(type => `- *${(type + '*').padEnd(6)}: ${(100 * cpu.times[type] / cpu.total).toFixed(2)}%`).join('\n')}
_CPU Core(s) Usage (${cpus.length} Core CPU)_
${cpus.map((cpu, i) => `${i + 1}. ${cpu.model.trim()} (${cpu.speed} MHZ)\n${Object.keys(cpu.times).map(type => `- *${(type + '*').padEnd(6)}: ${(100 * cpu.times[type] / cpu.total).toFixed(2)}%`).join('\n')}`).join('\n\n')}` : ''}
                `.trim()
                m.reply(respon)
                
    } else if (itsMe && isCmd2 && command === "openai") {
      try {
        const configuration = new Configuration({
              apiKey: "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", 
            });
            const openai = new OpenAIApi(configuration);
            
            const response = await openai.createCompletion({
              model: "text-davinci-003",
              prompt: text,
              temperature: 0.3,
              max_tokens: 3000,
              top_p: 1.0,
              frequency_penalty: 0.0,
              presence_penalty: 0.0,
            });
        m.reply("*OpenAI's GPT-3 BOT*" + response.data.choices[0].text)
      } catch (err) {
        console.log(err)
        m.reply('Maaf, sepertinya ada yang error')
      }
} else if (itsAnu && !isCmd2 && budy && isUrl(budy) && budy.includes("tiktok.com")) {
      const { author: { nickname }, video, description } = await tiktokdl(isUrl(budy)[0]).catch(async _ => await tiktokdlv2(isUrl(budy)[0]))
      const url4 = video.no_watermark || video.no_watermark_hd || video.with_watermark || video.no_watermark_raw
      if (!url4) return m.reply("Can't download video!")
      client.sendMessage(from, { video: { url: url4 }, mimetype: "video/mp4", caption: `
🔗 *Url:* ${url4}
🧏 *Nickname:* ${nickname}${description ? `🖹 *Description:* ${description}` : ''}
`.trim(), fileName: "tiktok.mp4" });
    }
  } catch (err) {
  m.reply(util.format(err))
}
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`Update ${__filename}`))
  delete require.cache[file]
  require(file)
})
