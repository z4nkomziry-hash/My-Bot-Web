#!/usr/bin/env python3
import os,re,json,logging,sys,asyncio,aiohttp
from telegram import Update,InlineKeyboardButton,InlineKeyboardMarkup
from telegram.ext import Application,CommandHandler,MessageHandler,ContextTypes,filters
from telegram.constants import ParseMode
logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s',level=logging.INFO,stream=sys.stdout)
logger=logging.getLogger(__name__)
PORT=int(os.environ.get('PORT',8080))
BOT_TOKEN=os.environ.get('BOT_TOKEN','')
if not BOT_TOKEN:logger.error("BOT_TOKEN not set!");sys.exit(1)
async def start(update:Update,context:ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🎉 بەخێربێیت بۆ KRD-ProDown Bot!\n\nلینکی ڤیدیۆ بنێرە بۆ داونلۆد",parse_mode=ParseMode.HTML)
async def handle(update:Update,context:ContextTypes.DEFAULT_TYPE):
    u=re.findall(r'https?://[^\s]+',update.message.text)
    if not u:await update.message.reply_text("⚠️ لینکی ڤیدیۆ بنێرە");return
    url=u[0];msg=await update.message.reply_text("⏳ چاوەڕێ بە...")
    try:
        async with aiohttp.ClientSession() as s:
            async with s.get(f'https://www.tikwm.com/api/?url={url}') as r:
                d=await r.json()
                if d.get('code')==0 and d.get('data'):
                    v=d['data'];play=v.get('hdplay')or v.get('play')
                    if play:
                        await update.message.reply_video(video=play,caption="✅ داونلۆد کرا!\n⚡ @KRDProDownBot",parse_mode=ParseMode.HTML)
                        await msg.delete();return
            async with s.post('https://api.cobalt.tools/api/json',json={'url':url,'vQuality':'720'},headers={'Content-Type':'application/json'}) as r:
                d=await r.json()
                if d.get('url'):
                    await update.message.reply_video(video=d['url'],caption="✅ داونلۆد کرا!\n⚡ @KRDProDownBot",parse_mode=ParseMode.HTML)
                    await msg.delete()
                else:await msg.edit_text("❌ نەتوانرا")
    except Exception as e:await msg.edit_text("❌ کێشەیەک ڕوویدا")
def main():
    app=Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",start))
    app.add_handler(MessageHandler(filters.TEXT&~filters.COMMAND,handle))
    logger.info("🤖 Bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)
if __name__=='__main__':main()
