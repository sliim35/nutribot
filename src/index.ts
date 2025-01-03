/**
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Router } from 'itty-router';
import { Markup, Telegraf } from 'telegraf';
import OpenAI from 'openai';
import { message } from 'telegraf/filters';
import { Update } from 'telegraf/types';

const router = Router();

const model = 'gpt-4o-mini';
const escapeSymbols = '_ * [ ] ( ) ~ ` > # + - = | { } . !';
const kitchens = [
    'Итальянская кухня',
    'Французская кухня',
    'Японская кухня',
    'Индийская кухня',
    'Китайская кухня',
    'Мексиканская кухня',
    'Русская кухня',
];
const getKitchen = () => kitchens[Math.floor(Math.random() * kitchens.length)];
const getInviteMessage = () => `
    Учти, что в приглашении должно быть указано, что нужно обращаться к дипломированному нутрициологу Двойнишниковой Дарье.

    Учти, что текст приглашения должен начинаться с трех emoji, которые ты считаешь подходящими к контексту. 
    Учти, что текст приглашения должен быть составлен по примеру, который ты найдешь ниже, но с исправленными ошибками и приведении его в более деловой стиль. 
    Учти, что текст приглашения должен быть уникальным.
    
    Пример приглашения:
    "Если вы хотите составить рацион на неделю, задать уточняющие вопросы, расшифровать анализы и получить рекомендации по питанию и приему витаминов и минералов,
    то обращайтесь в личные сообщения к дипломированному нутрициологу, Двойнишниковой Дарье."

    Перед отправкой ответа, пожалуйста, проверь его на наличие ошибок и опечаток.
`;

const getRecommendationMessage = (message = '') => `
        Напиши на основе полученного запроса: ${message} клиента (учти, что в запросе содержится и конечный результат),  краткое, но емкое решение его проблемы. 
        Также учти, что клиент хочет улучшить свое качество жизни через питание и прием витаминов и минералов, а также поддержания здорового образа жизни.

        Формат ответа:
        - Ответ не должен быть больше чем три предложения. 
        - Ответ должен быть структурированным и легко читаемым. 
        - Ответ должен быть дан в форме текста без использования markdown или html разметки
        - Допускается использовать перенос строки, * для выделения текста жирным шрифтом, - для маркировки пунктов, _ для курсива, больше ничего использовать нельзя.
        - По всему тексту ответа символы ${escapeSymbols} должны быть экранированы
        - Ответ должен быть дан в поддерживаемом месенджером Telegram формате, пример ответа:
        \`\`\`markdown
        текст ответа тут
        \`\`\`

        Закончить ответ нужно четвертым предложением и ненавязчиво пригласить в деловом стиле на двухмесячное ведение.
        Последнее предложение должно быть отдельно от предыдущих трех.
        ${getInviteMessage()}
    `;

const getRecipeMessage = () => `
    Нужно написать рецепт из ${getKitchen}, который полезный и популярен среди нутрициологов в этой стране.
    Укажи в какой стране популярен этот рецепт и почему ты считаешь его полезным.
    Учти, что блюдо, приготовленное по рецепту должно подаваться в ресторанах с минимум одной звездой «Мишлен».
    Учти, что сахар и мука в рецепте должны быть заменены на альтернативные продукты.
   
    Рецепт должен быть описан в формате текста без использования markdown или html разметки.
    При написании рецепта используйте простые и понятные слова.
    Учти, что в рецепте должны быть указаны все ингредиенты и последовательность их добавления, каждый шаг должен быть описан отдельно.

    Закончить рецепт нужно ненавязчивым приглашением в деловом стиле на двухмесячное ведение.
    Приглашение должно быть отдельно от рецепта.
    ${getInviteMessage()}
`;

const botConnect = (token: string, ai: ReturnType<typeof openaiConnect>) => {
    const bot = new Telegraf(token);
    bot.start((ctx) =>
        ctx.reply(
            `Привет ${ctx.message.from.first_name}! 
Я бот-помощник по питанию! 🫐
Опиши подробно свой запрос и что ты хочешь получить в результате работы с нутрициологом, и я постараюсь помочь тебе! 🍏`
        )
    );

    bot.hears(/прив|здравст/iu, (ctx) => ctx.sendSticker('CAACAgIAAxkBAAELH8FnaStKYP0XDy5LL98x7I_Ej2SV3wAC1xQAAtzRCUn4G0gDnaqg-DYE'));

    bot.telegram.setMyCommands([
        { command: 'start', description: 'Помощь бота-нутрициолога 🤖' },
        { command: 'recipe', description: 'Полезный рецепт 🥙' },
    ]);

    bot.command('recipe', async (ctx) => {
        try {
            const completion = await ai(getRecipeMessage());
            await ctx.reply(
                completion.choices[0].message.content ?? 'Сегодня рецептов нет 😔',
                Markup.inlineKeyboard([Markup.button.callback('Запись на разбор', 'signup')])
            );
        } catch (error) {
            console.error('bot.command(recipe)) error:', error);
            await ctx.reply('Сегодня рецептов нет 😔');
        }
    });

    bot.action('signup', async (ctx) => {
        await ctx.reply('Запись на разбор осуществляется посредством личных сообщений');
        await ctx.replyWithContact('+79115291121', 'Дарья Двойнишникова');
    });
    bot.action('recipe', async (ctx) => {
        try {
            const completion = await ai(getRecipeMessage());
            await ctx.reply(
                completion.choices[0].message.content ?? 'Сегодня рецептов нет 😔',
                Markup.inlineKeyboard([Markup.button.callback('Запись на разбор', 'signup')])
            );
        } catch (error) {
            console.error('bot.command(recipe)) error:', error);
            await ctx.reply('Сегодня рецептов нет 😔');
        }
    });

    bot.on(message('text'), async (ctx) => {
        try {
            const completion = await ai(getRecommendationMessage(ctx.message.text.trim()));
            await ctx.reply(
                completion.choices[0].message.content ?? 'Не могу помочь',
                Markup.inlineKeyboard([
                    Markup.button.callback('Запись на разбор', 'signup'),
                    Markup.button.callback('Полезный рецепт', 'recipe'),
                ])
            );
        } catch (error) {
            console.error('bot.on(message(text)) error:', error);
            await ctx.reply('Не могу помочь или произошла ошибка');
        }
    });

    bot.launch({
        webhook: {
            domain: 'nutribot.slim-r35.workers.dev',
            port: 443,
        },
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    return bot;
};

const openaiConnect = (token: string) => {
    const client = new OpenAI({
        apiKey: token,
    });

    return (message = '') =>
        client.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        'Ты опытный нутрициолог со стажем работы более 10 лет и высшим медицинским образованием. Тебе на консультацию обращаются клиенты, который хотят наладить и улучшить свое качество жизни через питание и прием витаминов и минералов, а также поддержания здорового образа жизни',
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
        });
};

router.post('/', async (request, env: Env, ctx) => {
    const ai = openaiConnect(env.OPENAI_TOKEN);
    const bot = botConnect(env.TELEGRAM_TOKEN, ai);

    const update = await request.json();
    await bot.handleUpdate(update as Update);

    return new Response(JSON.stringify({ data: 'Success' }));
});

router.all('*', () => new Response('Not Found', { status: 404 }));

export default router satisfies ExportedHandler<Env>;
