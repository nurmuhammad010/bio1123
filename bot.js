const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Admin ID lar ro'yxati
const ADMIN_IDS = [5343628445, 6443222044];

require('dotenv').config()
const TOKEN =  process.env.TOKEN
const bot = new TelegramBot(TOKEN, { polling: true });

// Testlarni saqlash
let tests = [];
let registeredUsers = {};

// Foydalanuvchi uchun menyu
const userKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Testni boshlash" }],
            [{ text: "Testni qayta boshlash" }, { text: "Testni to'xtatish" }],
            [{ text: "Natijalarni ko'rish" }],
            [{ text: "Biz bilan bog'lanish" }, { text: "Bosh menyu" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
    }
};

// Admin uchun menyu
const adminKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "➕ Test yaratish" }],
            [{ text: "📊 Statistikani ko'rish" }],
            [{ text: "👥 Foydalanuvchilarni kuzatish" }],
            [{ text: "📁 Testlarni ko'rish" }],
            [{ text: "📢 Xabar yuborish" }],
            [{ text: "Bosh menyu" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
    }
};

// Admin ekanligini tekshirish funksiyasi
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// Testlarni papkadan o'qish funksiyasi (barcha papkalarni o'qish)
function loadTestsFromFolder() {
    const mainFolderPath = path.join(__dirname, 'test');
    if (!fs.existsSync(mainFolderPath)) {
        console.log("Testlar papkasi mavjud emas!");
        return [];
    }

    const folders = fs.readdirSync(mainFolderPath);
    const loadedTests = [];

    folders.forEach(folder => {
        const folderPath = path.join(mainFolderPath, folder);
        const filePath = path.join(folderPath, 'test.json');

        if (fs.existsSync(filePath)) {
            const testData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            loadedTests.push(testData);
        }
    });

    return loadedTests;
}

// Testlarni yangi papkada saqlash funksiyasi
function saveTestToFolder(test) {
    const mainFolderPath = path.join(__dirname, 'test');

    // Asosiy papkani yaratish (agar mavjud bo'lmasa)
    if (!fs.existsSync(mainFolderPath)) {
        fs.mkdirSync(mainFolderPath, { recursive: true });
    }

    // Yangi papka uchun yagona nom yaratish
    const folderName = `test_${Date.now()}`;
    const folderPath = path.join(mainFolderPath, folderName);

    // Yangi test papkasini yaratish
    fs.mkdirSync(folderPath, { recursive: true });

    // Test ma'lumotlarini faylga yozish
    const filePath = path.join(folderPath, 'test.json');
    fs.writeFileSync(filePath, JSON.stringify(test, null, 2), 'utf-8');

    console.log(`Test ${folderPath} papkasiga saqlandi.`);
}

// Boshlang‘ich /start buyrug‘i
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(userId)) {
        bot.sendMessage(chatId, "Xush kelibsiz, Admin!", adminKeyboard);
    } else {
        bot.sendMessage(chatId, "Xush kelibsiz! Botdan foydalanish uchun ro'yxatdan o'ting.", {
            reply_markup: {
                keyboard: [
                    [{ text: "Telefon raqamni yuborish", request_contact: true }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            }
        });
    }
});

// Telefon raqamni qabul qilish
bot.on('contact', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const phone = msg.contact.phone_number;

    registeredUsers[userId] = {
        name: userName,
        phone: phone,
        score: 0,
    };

    bot.sendMessage(chatId, `${userName}, ro'yxatdan muvaffaqiyatli o'tdingiz!`, userKeyboard);
});

// ➕ Test yaratish
bot.onText(/➕ Test yaratish/, (msg) => {
    const chatId = msg.chat.id;

    if (isAdmin(msg.from.id)) {
        bot.sendMessage(chatId, "Yangi test savolini kiriting:");
        bot.once('message', (questionMsg) => {
            const question = questionMsg.text;

            bot.sendMessage(chatId, "Variantlarni kiriting (Misol: A) To'g'ri javob, B) Noto'g'ri javob):");
            bot.once('message', (optionsMsg) => {
                const options = optionsMsg.text.split(',').map(opt => opt.trim());

                bot.sendMessage(chatId, "To'g'ri javobni tanlang:", {
                    reply_markup: {
                        inline_keyboard: options.map((opt, index) => [{ text: opt, callback_data: `correct_${index}` }])
                    }
                });

                bot.once('callback_query', (callbackQuery) => {
                    const correctIndex = parseInt(callbackQuery.data.split('_')[1]);
                    const newTest = { question, options, correctIndex };

                    // Testni tests massiviga qo‘shish
                    tests.push(newTest);

                    // Testni yangi papkada saqlash
                    saveTestToFolder(newTest);

                    bot.sendMessage(chatId, "Test muvaffaqiyatli yaratildi!", adminKeyboard);
                });
            });
        });
    } else {
        bot.sendMessage(chatId, "Bu buyruq faqat admin uchun mavjud.");
    }
});

// 📊 Statistikani ko'rish
bot.onText(/📊 Statistikani ko'rish/, (msg) => {
    const chatId = msg.chat.id;

    if (isAdmin(msg.from.id)) {
        const totalUsers = Object.keys(registeredUsers).length;
        const totalTests = tests.length;

        bot.sendMessage(chatId, `Statistika:\n- Ro'yxatdan o'tgan foydalanuvchilar: ${totalUsers}\n- Testlar soni: ${totalTests}`, adminKeyboard);
    } else {
        bot.sendMessage(chatId, "Bu buyruq faqat admin uchun mavjud.");
    }
});

// 📁 Testlarni ko'rish (admin uchun barcha testlarni ko'rish)
bot.onText(/📁 Testlarni ko'rish/, (msg) => {
    const chatId = msg.chat.id;

    if (isAdmin(msg.from.id)) {
        tests = loadTestsFromFolder(); // Barcha testlarni papkadan o'qib olish
        if (tests.length > 0) {
            let testsList = 'Joriy testlar:\n';
            tests.forEach((test, index) => {
                testsList += `${index + 1}. ${test.question}\n`;
            });
            bot.sendMessage(chatId, testsList, adminKeyboard);
        } else {
            bot.sendMessage(chatId, "Hozircha testlar mavjud emas.", adminKeyboard);
        }
    } else {
        bot.sendMessage(chatId, "Bu buyruq faqat admin uchun mavjud.");
    }
});

// Testni boshlash
bot.onText(/Testni boshlash/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (registeredUsers[userId]) {
        tests = loadTestsFromFolder(); // Papkadan testlarni o'qib olish
        if (tests.length > 0) {
            bot.sendMessage(chatId, "Test boshlandi! Birinchi savol:");

            let currentQuestionIndex = 0;  // Boshida birinchi savol
            const sendNextQuestion = () => {
                if (currentQuestionIndex < tests.length) {
                    const currentTest = tests[currentQuestionIndex];
                    const options = currentTest.options.map((opt, index) => ({
                        text: opt,
                        callback_data: `answer_${index}`,
                    }));

                    bot.sendMessage(chatId, currentTest.question, {
                        reply_markup: {
                            inline_keyboard: [options],
                        },
                    });

                    currentQuestionIndex++;  // Keyingi savolga o'tish
                } else {
                    bot.sendMessage(chatId, "Test tugadi. Natijangiz: " + registeredUsers[userId].score);
                    // Testni yakunlash, natijani ko'rsatish
                }
            };

            sendNextQuestion(); // Birinchi savolni yuborish

            // Javobni qabul qilish va keyingi savolni yuborish
            bot.on('callback_query', (callbackQuery) => {
                const answerIndex = parseInt(callbackQuery.data.split('_')[1]);
                const currentTest = tests[currentQuestionIndex - 1];

                if (answerIndex === currentTest.correctIndex) {
                    registeredUsers[userId].score += 1;
                    bot.sendMessage(chatId, "To'g'ri javob! Natijangiz yangilandi.");
                } else {
                    bot.sendMessage(chatId, "Noto'g'ri javob.");
                }

                // Keyingi savolni yuborish
                sendNextQuestion();
            });

        } else {
            bot.sendMessage(chatId, "Hozircha testlar mavjud emas.");
        }
    } else {
        bot.sendMessage(chatId, "Siz ro'yxatdan o'tmagansiz.");
    }
});

// Testni qayta boshlash
bot.onText(/Testni qayta boshlash/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (registeredUsers[userId]) {
        registeredUsers[userId].score = 0;
        bot.sendMessage(chatId, "Test qayta boshlanishi uchun tayyor! Testni boshlang.");
    } else {
        bot.sendMessage(chatId, "Siz ro'yxatdan o'tmagansiz.");
    }
});

// Biz bilan bog'lanish
bot.onText(/Biz bilan bog'lanish/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Biz bilan bog'lanish uchun kontakt: @yourContact.");
});
