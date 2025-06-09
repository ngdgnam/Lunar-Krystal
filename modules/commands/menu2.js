const fs = require('fs');
const path = require('path');
const { readFileSync, existsSync } = require('fs-extra');
const { findBestMatch } = require('string-similarity');

module.exports.config = {
  name: 'menu',
  version: '2.3.0',
  hasPermssion: 0,
  credits: 'DC-Nam mod by Gojo Satoru & Grok',
  description: 'Hiển thị menu lệnh tùy chỉnh theo quyền hạn người dùng',
  commandCategory: 'Tiện ích',
  usages: '[tên lệnh | all]',
  cooldowns: 5,
  envConfig: {
    autoUnsend: { status: true, timeOut: 90, usePrefix: false }
  }
};

const { autoUnsend = module.exports.config.envConfig.autoUnsend } = global.config?.menu || {};

function getRandomImage() {
  const dir = path.join(__dirname, '/includes/');
  if (!existsSync(dir)) {
    console.warn(`[MENU] Thư mục ${dir} không tồn tại! Tạo thư mục mặc định.`);
    fs.mkdirSync(dir, { recursive: true });
    return null;
  }
  const files = fs.readdirSync(dir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
  if (!files.length) return null;
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return fs.createReadStream(path.join(dir, randomFile));
}

function getRandomIcons(count) {
  const allIcons = ['🌟', '🚀', '💡', '🔥', '🎈', '🎉', '🎊', '🏆', '🏅', '🥇', '🥈', '🥉', '🎖️', '🏵️', '🎗️', '🎯', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🎮', '🕹️', '🎰', '🎳', '🏏', '🏑', '🏒', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎱', '🪀', '🏹', '🎢', '🎡', '🎠'];
  return [...allIcons].sort(() => 0.5 - Math.random()).slice(0, count);
}

function permissionTxt(permission) {
  return permission === 0 ? '👥 Thành Viên' :
         permission === 1 ? '👑 Quản Trị Viên Nhóm' :
         permission === 2 ? '🛠️ Người Điều Hành Bot' : '🌟 ADMINBOT';
}

function infoCmds(config) {
  return `╭━━━『 ℹ️ ${config.name} ℹ️ 』━━━╮\n` +
         `┃ 🔢 Phiên bản: ${config.version || 'N/A'}\n` +
         `┃ 🔐 Quyền hạn: ${permissionTxt(config.hasPermssion)}\n` +
         `┃ 👤 Tác giả  : ${config.credits || 'N/A'}\n` +
         `┃ 📝 Mô tả    : ${config.description || 'Không có mô tả'}\n` +
         `┃ 📁 Nhóm lệnh: ${config.commandCategory || 'N/A'}\n` +
         `┃ 🔧 Cách dùng: ${config.usages || 'Không có hướng dẫn'}\n` +
         `┃ ⏱️ Thời gian chờ: ${config.cooldowns || 0} giây\n` +
         `╰━━━━━━━━━━━━━━━━━━━━╯`;
}

async function getThreadAdminIDs(api, threadID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    return threadInfo.adminIDs.map(admin => admin.id);
  } catch (error) {
    console.error('[MENU] Lỗi khi lấy danh sách admin:', error);
    return [];
  }
}

function canAccessCommand(cmdPermssion, userPermssion, isGroupAdmin) {
  if (!Number.isInteger(userPermssion) || userPermssion < 0 || userPermssion > 3) userPermssion = 0;
  if (userPermssion === 3) return true; // ADMINBOT
  if (userPermssion === 2) return cmdPermssion <= 2; // Người điều hành bot
  if (isGroupAdmin && userPermssion === 1) return cmdPermssion <= 1; // Quản trị viên nhóm
  return cmdPermssion === 0; // Thành viên
}

function commandsGroup(permssion, isGroupAdmin) {
  const groups = [];
  for (const [name, cmd] of global.client.commands) {
    if (canAccessCommand(cmd.config.hasPermssion, permssion, isGroupAdmin)) {
      const { commandCategory } = cmd.config;
      const group = groups.find(g => g.commandCategory === commandCategory);
      if (group) group.commandsName.push(name);
      else groups.push({ commandCategory, commandsName: [name] });
    }
  }
  return groups.sort((a, b) => b.commandsName.length - a.commandsName.length);
}

function findSimilarCommands(input, commands, limit = 3) {
  const matches = findBestMatch(input, commands);
  return matches.ratings
    .filter(match => match.rating > 0.3)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map(match => match.target);
}

function sendFullCommandList(send, un, tid, mid, isAdmin, isGroupAdmin, permssion, api) {
  const cmds = Array.from(global.client.commands.values()).filter(cmd =>
    canAccessCommand(cmd.config.hasPermssion, permssion, isGroupAdmin)
  );
  if (!cmds.length) return send('⚠️ Không có lệnh nào bạn có thể truy cập!', tid, mid);

  const icons = getRandomIcons(cmds.length);
  let txt = '╭───『 All Commands 』───╮\n';
  cmds.forEach((cmd, index) => {
    txt += `┃ ${index + 1}. ${icons[index]} ${cmd.config.name}\n`;
  });
  txt += `╰─────────────────────╯\n` +
         `🔸 Dùng "menu + tên lệnh" để xem chi tiết\n` +
         `🔸 Gỡ tự động sau: ${autoUnsend.timeOut}s`;

  const attachment = getRandomImage();
  const msg = attachment ? { body: txt, attachment } : { body: txt };
  send(msg, tid, (err, info) => {
    if (err) console.error('[MENU] Gửi tin nhắn thất bại:', err);
    if (autoUnsend.status) setTimeout(() => un(info.messageID), autoUnsend.timeOut * 1000);
  }, mid);
}

module.exports.run = async function ({ api, event, args, permssion }) {
  const { sendMessage: send, unsendMessage: un } = api;
  const { threadID: tid, messageID: mid, senderID: sid } = event;
  const cmds = global.client.commands;
  const isAdmin = permssion === 2 || permssion === 3;
  const adminIDs = await getThreadAdminIDs(api, tid);
  const isGroupAdmin = adminIDs.includes(sid);

  if (args.length >= 1) {
    const cmdInput = args.join(' ').toLowerCase();
    if (cmdInput === 'all') {
      return sendFullCommandList(send, un, tid, mid, isAdmin, isGroupAdmin, permssion, api);
    }

    const cmd = cmds.get(cmdInput) || cmds.find(c => c.config.name.toLowerCase() === cmdInput);
    if (cmd && canAccessCommand(cmd.config.hasPermssion, permssion, isGroupAdmin)) {
      const attachment = getRandomImage();
      const msg = attachment ? { body: infoCmds(cmd.config), attachment } : { body: infoCmds(cmd.config) };
      return send(msg, tid, mid);
    } else {
      const accessibleCommands = Array.from(cmds.keys()).filter(name =>
        canAccessCommand(cmds.get(name).config.hasPermssion, permssion, isGroupAdmin)
      );
      const similarCommands = findSimilarCommands(cmdInput, accessibleCommands);
      const message = similarCommands.length > 0
        ? `❓ Không tìm thấy lệnh "${cmdInput}". Có thể bạn muốn:\n${similarCommands.map(cmd => `• ${cmd}`).join('\n')}`
        : `❌ Không tìm thấy lệnh "${cmdInput}" hoặc bạn không có quyền truy cập.`;
      return send(message, tid, mid);
    }
  }

  const data = commandsGroup(permssion, isGroupAdmin);
  if (!data.length) return send('⚠️ Không có lệnh nào phù hợp với quyền hạn của bạn!', tid, mid);

  const icons = getRandomIcons(data.length);
  let txt = '╭━━━『 🌟 Menu 🌟 』━━╮\n';
  data.forEach((group, i) => {
    txt += `┃ ${i + 1}. ${icons[i]} ${group.commandCategory}: ${group.commandsName.length} lệnh\n`;
  });
  txt += `╰━━━━━━━━━━━━━╯\n` +
         `╭━━━━━━━╮\n` +
         `┃  ${data.reduce((sum, g) => sum + g.commandsName.length, 0)} lệnh.\n` +
         `╰━━━━━━━╯\n` +
         `📝 Reply số hoặc tên nhóm từ 1 đến ${data.length} để xem chi tiết\n` +
         `💡 Gõ "menu all" để xem tất cả lệnh có thể truy cập\n` +
         `⏱️ Tự động gỡ sau: ${autoUnsend.timeOut}s\n` +
         `📱 Facebook Admin: ${global.config.FACEBOOK_ADMIN || "Chưa cài đặt"}`;

  const attachment = getRandomImage();
  const msg = attachment ? { body: txt, attachment } : { body: txt };
  send(msg, tid, (err, info) => {
    if (err) {
      console.error('[MENU] Gửi tin nhắn thất bại:', err);
      return;
    }
    global.client.handleReply.push({
      name: this.config.name,
      messageID: info.messageID,
      author: sid,
      'case': 'infoGr',
      data,
      permssion,
      isGroupAdmin
    });
    if (autoUnsend.status) setTimeout(() => un(info.messageID), autoUnsend.timeOut * 1000);
  });
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
  const { sendMessage: send, unsendMessage: un } = api;
  const { threadID: tid, messageID: mid, senderID: sid, body } = event;

  if (sid !== $.author) {
    return send('🚫 Bạn không phải người gọi menu, dùng lệnh "menu" để xem nhé!', tid, mid);
  }

  switch ($.case) {
    case 'infoGr': {
      const input = body.trim().toLowerCase();
      let index = parseInt(input) - 1;
      let selectedGroup = $.data[index];

      if (isNaN(index) || !selectedGroup) {
        index = $.data.findIndex(g => g.commandCategory.toLowerCase() === input);
        selectedGroup = $.data[index];
      }

      if (!selectedGroup || index < 0 || index >= $.data.length) {
        return send(`❌ "${input}" không hợp lệ. Vui lòng reply số hoặc tên nhóm từ 1 đến ${$.data.length}!`, tid, mid);
      }

      un($.messageID);
      const icons = getRandomIcons(selectedGroup.commandsName.length);
      let txt = `╭━━━『 📁 ${selectedGroup.commandCategory} 📁 』━━━╮\n`;
      selectedGroup.commandsName.forEach((name, i) => {
        txt += `┃ ${i + 1}. ${icons[i]} ${name}\n`;
      });
      txt += `╰━━━━━━━━━━━━━━━━━━━━━╯\n` +
             `📝 Reply số hoặc tên lệnh từ 1 đến ${selectedGroup.commandsName.length} để xem chi tiết\n` +
             `⏱️ Tự động gỡ sau: ${autoUnsend.timeOut}s`;

      const attachment = getRandomImage();
      const msg = attachment ? { body: txt, attachment } : { body: txt };
      send(msg, tid, (err, info) => {
        if (err) {
          console.error('[MENU] Gửi tin nhắn thất bại:', err);
          return;
        }
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: sid,
          'case': 'infoCmds',
          data: selectedGroup.commandsName,
          permssion: $.permssion,
          isGroupAdmin: $.isGroupAdmin
        });
        if (autoUnsend.status) setTimeout(() => un(info.messageID), autoUnsend.timeOut * 1000);
      });
      break;
    }
    case 'infoCmds': {
      const input = body.trim().toLowerCase();
      let index = parseInt(input) - 1;
      let cmdName = $.data[index];

      if (isNaN(index) || !cmdName) {
        cmdName = $.data.find(name => name.toLowerCase() === input);
        index = $.data.indexOf(cmdName);
      }

      if (!cmdName || index < 0 || index >= $.data.length) {
        return send(`❌ "${input}" không hợp lệ. Vui lòng reply số hoặc tên lệnh từ 1 đến ${$.data.length}!`, tid, mid);
      }

      const cmd = global.client.commands.get(cmdName);
      if (!cmd || !canAccessCommand(cmd.config.hasPermssion, $.permssion, $.isGroupAdmin)) {
        return send(`❌ Bạn không có quyền truy cập lệnh "${cmdName}"`, tid, mid);
      }

      un($.messageID);
      const attachment = getRandomImage();
      const msg = attachment ? { body: infoCmds(cmd.config), attachment } : { body: infoCmds(cmd.config) };
      send(msg, tid, mid);
      break;
    }
  }
};