const { Telegraf, Markup, session } = require('telegraf');
const LocalSession = require('telegraf-session-local'); // Sessiya uchun
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(new LocalSession({ database: 'sessions.json' }).middleware()); // Sessiyani faylda saqlash

const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID || '-1002297160068';

// 🛠 Sessiya uchun middleware
bot.use((ctx, next) => {
    ctx.session ??= {}; // Agar sessiya bo‘lmasa, yaratish
    return next();
});

// 📌 Start komandasi
bot.start((ctx) => {
    const user = ctx.from;
    bot.telegram.sendMessage(GROUP_CHAT_ID, `🆕 <b>Yangi foydalanuvchi:</b>
👤 <b>Ism:</b> ${user.first_name || 'Noma’lum'}
🔹 <b>Username:</b> @${user.username || 'yo‘q'}
🆔 <b>ID:</b> ${user.id}`, { parse_mode: 'HTML' });
    
    ctx.session = {};
    ctx.reply('😊 Assalomu alaykum! Buyurtma turini tanlang:',
        Markup.keyboard([
            ['💻 Web-sayt buyurtma berish'],
            ['🤖 Telegram bot buyurtma berish']
        ]).resize()
    );
});

// 📌 Buyurtma turini tanlash
bot.hears(['💻 Web-sayt buyurtma berish', '🤖 Telegram bot buyurtma berish'], (ctx) => {
    ctx.session.orderType = ctx.message.text.includes('Web-sayt') ? 'Web-sayt' : 'Telegram bot';
    
    if (ctx.session.orderType === 'Web-sayt') {
        ctx.session.step = 'ask_page_count';
        return ctx.reply('📊 Sayt necha sahifadan iborat bo‘ladi?',
            Markup.keyboard([
                ['1-3 sahifa', '3-5 sahifa'],
                ['5+ sahifa (admin panel)']
            ]).resize()
        );
    } else {
        ctx.reply('📌 Loyiha haqida qisqacha tushuntiring.', Markup.removeKeyboard());
        ctx.session.step = 'get_description';
    }
});

// 📌 Matnli javoblarni qabul qilish
bot.on('text', async (ctx) => {
    if (!ctx.session?.step) return;

    const text = ctx.message.text;
    const user = ctx.from;

    if (ctx.session.step === 'ask_page_count') {
        ctx.session.pageCount = text;
        ctx.session.step = 'get_description';
        return ctx.reply('📌 Loyiha haqida qisqacha tushuntiring.', Markup.removeKeyboard());
    }

    if (ctx.session.step === 'get_description') {
        ctx.session.description = text;
        ctx.session.step = 'ask_example';
        return ctx.reply('🧐 Shu turdagi loyiha oldin qilinganmi?', 
            Markup.keyboard([
                ['✅ Ha, misol bor', '❌ Yo‘q, misol yo‘q']
            ]).resize()
        );
    }

    if (ctx.session.step === 'ask_example') {
        if (text === '✅ Ha, misol bor') {
            ctx.session.step = 'get_example';
            return ctx.reply('🔗 Misollar silkasi yoki nomini yozing:', Markup.removeKeyboard());
        } else {
            ctx.session.example = 'Yo‘q';
            return askForContact(ctx);
        }
    }

    if (ctx.session.step === 'get_example') {
        ctx.session.example = text;
        return askForContact(ctx);
    }

    if (ctx.session.step === 'get_contact') {
        if (!text.match(/^\+998\d{9}$/)) {
            return ctx.reply('❌ Telefon raqami noto‘g‘ri! Quyidagi formatda kiriting:\n\n📞 *+998901234567*', { parse_mode: 'Markdown' });
        }

        ctx.session.contact = text;
        ctx.reply('🎉 Buyurtmangiz qabul qilindi! Tez orada siz bilan bog‘lanamiz. 😊', { parse_mode: 'Markdown' });

        // 🔥 Buyurtmani guruhga yuborish
        const orderInfo = `🔥 <b>Yangi buyurtma!</b>
📌 <b>Tur:</b> ${ctx.session.orderType}
${ctx.session.pageCount ? `📊 <b>Sahifalar:</b> ${ctx.session.pageCount}` : ''}
📝 <b>Tavsif:</b> ${ctx.session.description}
📞 <b>Kontakt:</b> ${ctx.session.contact}
${ctx.session.example ? `🔗 <b>Misol:</b> ${ctx.session.example}` : ''}
👤 <b>Buyurtmachi:</b> @${user.username || 'yo‘q'}
🆔 <b>ID:</b> ${user.id}`;

        bot.telegram.sendMessage(GROUP_CHAT_ID, orderInfo, { parse_mode: 'HTML' });
        ctx.session = {}; // Sessiyani tozalash
    }
});

// 📌 Telefon raqamini so‘rash
function askForContact(ctx) {
    ctx.session.step = 'get_contact';
    ctx.reply('📞 Iltimos, telefon raqamingizni *+998901234567* formatida kiriting:', { 
        parse_mode: 'Markdown',
        ...Markup.removeKeyboard()
    });
}

// 📌 `/newuser` komandasi
bot.command('newuser', (ctx) => {
  bot.telegram.sendMessage(GROUP_CHAT_ID, 
    '🆕 <b>Yangi foydalanuvchi:</b>\n' + 
    '👤 <b>Ism:</b> Uychi tovar\n' + 
    '🔹 <b>Username:</b> @Uychi_tovar\n' + 
    '🆔 <b>ID:</b> 6773313319', 
    { parse_mode: 'HTML' }
  );
});

// 🚀 Botni ishga tushirish
bot.launch().then(() => console.log("🚀 Bot ishga tushdi!"));
