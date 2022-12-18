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

const Crypto = require("crypto");
const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const path = require("path");
const tmpdir = require('os').tmpdir;

const {
  Configuration,
  OpenAIApi
} = require("openai")
const setting = require('./key.json')
const speed = require('performance-now')
const { performance } = require('perf_hooks')
const { sizeFormatter } = require('human-readable')
const os = require("os");

const downloadMedia = async (message) => {
  let stream;
  switch (getContentType(message)) {
    case 'imageMessage':
      stream = await downloadContentFromMessage(message.imageMessage, 'image');
      break;
    case 'videoMessage':
      stream = await downloadContentFromMessage(message.videoMessage, 'video');
      break;
    case 'audioMessage':
      stream = await downloadContentFromMessage(message.audioMessage, 'audio');
      break;
    default:
      return null;
  }
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
};

const generateTempPath = (mimeType) => {
  return path.join(tmpdir(),
      'processing-' +
      Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) +
      '.' + mimeType);
};

const saveFileToTempPath = async (buffer, mimeType) => {
  let { execa } = await import("execa");
  const binaryData = buffer.toString('binary');
  const tempPath = generateTempPath(mimeType);
  await fs.writeFileSync(tempPath, binaryData,
      'binary');
  const newTempPath = tempPath.split('.')[0] + '.wav';
  await execa('ffmpeg', ['-i', tempPath, newTempPath]);
  return newTempPath;
};

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

const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`
})

module.exports = sansekai = async (client, m, chatUpdate, store) => {
  try {
    var body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'lateButtonReplyMessage') ? m.message.lateButtonReplyMessage.selectedId : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
    var prefix = /^[Â°â€¢Ï€Ã·Ã—Â¶âˆ†Â£Â¢â‚¬Â¥Â®â„¢âœ“=|~!?@#%^&.zZ_•\/\\Â©^<+]/.test(body) ? body.match(/^[Â°â€¢Ï€Ã·Ã—Â¶âˆ†Â£Â¢â‚¬Â¥Â®â„¢âœ“=|~!?@#%^&.zZ_+•\/\\Â©^<+]/gi)[0]: '-'
    comm = body.slice(1).trim().split(" ").shift().toLowerCase()
    if (prefix != "") { 
      if (!body.startsWith(prefix)) { 
        cmd = false 
        comm = "" 
      } else { 
        cmd = true 
        comm = body.slice(1).trim().split(" ").shift().toLowerCase() 
      } 
    } else { 
      cmd = false 
      comm = body.trim().split(" ").shift().toLowerCase() 
    }
    
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
    if (argsLog && !cmd) {
      console.log(chalk.black(chalk.bgWhite('[ MSG ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
    } else if (argsLog && cmd) {
      console.log(chalk.black(chalk.bgWhite('[ CMD ]')), color(comm, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
    }
    await client.readMessages([key])
    await client.sendPresenceUpdate("composing", from)
    
    if (cmd && comm === "ping") {
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
    } else if (!cmd && budy) {
      try {
        const configuration = new Configuration({
          apiKey: setting.keyopenai,
        });
        const openai = new OpenAIApi(configuration);
        const response = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: budy,
          erature: 0,
          max_tokens: 3000,
          top_p: 1,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        });
        m.reply("*OpenAI's GPT-3 BOT*" + response.data.choices[0].text)
      } catch (err) {
        console.log(err)
        m.reply('Maaf, sepertinya ada yang error')
      }
    } else if (!cmd && !budy && m.mtype == "audioMessage") {
      let { execa } = await import("execa");
      let media = await downloadMedia(m.message)
      if (media.length >20*1000000) {
        return
      }
      let mimetype = m.mtype.split(';')[0].split('/')[1];
      const tempPath = await saveFileToTempPath(media, mimetype);
      const res = await execa('python', [
    path.resolve(
        __dirname + '../../../pythonScripts/speechToText.py'),
    tempPath]);
      const file = fs.readFileSync(
      path.resolve(__dirname, '../../pythonScripts/temp1.txt'), 'utf8');
  // Remove temp files.
  try {
    fs.unlinkSync(tempPath);
    fs.unlinkSync(tempPath.split('.')[0] +'.' + mimetype);
  } catch (err) {
    console.error(err);
  }
  if (res['failed']) {
    console.log(util.inspect(res));
    return;
  }
  const output = 'התמלול של ההודעה הסתיים:' + '\n' + file.toString();
  await client.sendMessage(message.key.remoteJid,
      {text: output}, {quoted: m.message});
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