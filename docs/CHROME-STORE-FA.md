# آماده‌سازی انتشار در Chrome Web Store

فایل قابل بارگذاری: `FarsiFlow-1.0.4-Chrome.zip`. فایل Complete برای نگهداری سورس، مستندات و تصاویر است و نباید به‌جای فایل Chrome در داشبورد بارگذاری شود.

## مواردی که مالک محصول باید تکمیل کند

1. ورود/ثبت حساب ناشر در https://chrome.google.com/webstore/devconsole و تکمیل مشخصات ناشر مطابق داشبورد.
2. انتخاب نام نهایی و بررسی تعارض نام/علامت؛ نام فعلی پیشنهادی مستقل «FarsiFlow | فارسی‌یار» است.
3. درج ایمیل پشتیبانی خودتان در اطلاعات ناشر؛ هیچ ایمیل فرضی در بسته وارد نشده است.
4. میزبانی فایل `store-assets/privacy-policy.html` در آدرسی عمومی، پایدار، HTTPS و قابل مشاهده بدون ورود. آن آدرس را در بخش Privacy policy قرار دهید. نسخهٔ داخل افزونه به‌تنهایی جایگزین آدرس عمومی نیست.
5. اجرای تست یکپارچگی و چک دستی زیر در Chrome واقعی؛ سپس ارسال برای بازبینی. این تحویل به‌معنای تأیید Google نیست.

## متن فهرست آماده

**عنوان:** FarsiFlow | فارسی‌یار

**خلاصه:** فونت فارسی دلخواه و نمایش خوانای متن فارسی و انگلیسی؛ بهینه برای ChatGPT، Gemini و Claude.

**توضیح کامل:**

فارسی‌یار نمایش متن فارسی و انگلیسی را در سایت‌های انتخابی شما خواناتر می‌کند. فونت هر دامنه را جدا انتخاب کنید، فایل فونت شخصی اضافه کنید و جهت هر پاراگراف را بر اساس زبان آن تنظیم کنید.

قابلیت‌ها:
- فونت‌های آزاد وزیرمتن، شبنم و ساحل؛ بدون نیاز به نصب در سیستم.
- افزودن فایل WOFF2، WOFF، TTF یا OTF و فونت نصب‌شدهٔ سیستم.
- تنظیم مستقل فونت، اندازه، فاصلهٔ خطوط و جهت برای هر سایت.
- محدودهٔ پیام‌های ChatGPT، Gemini و Claude با حفظ ساختار رابط سایت.
- تشخیص پاراگراف فارسی و انگلیسی، جداسازی جهت لینک و کد و حفظ نمایش فرمول.
- بهبود کادر نوشتن و پاسخ در حال تولید.
- فعال‌سازی و خاموش‌کردن برای هر دامنه؛ مجوز اختیاری و قابل لغو.
- پشتیبان JSON تنظیمات و رابط فارسی با حالت تیره.

متن اصلی تغییر نمی‌کند؛ افزونه کاراکتر پنهان به گفتگو اضافه نمی‌کند. پردازش در همان مرورگر انجام می‌شود و هیچ متن گفتگو یا تاریخچه‌ای به سرور توسعه‌دهنده ارسال نمی‌شود.

صفحات داخلی Chrome، Chrome Web Store، PDF و متن تصویری قابل تغییر نیستند. تشخیص زبان هوشمند یک تخمین است و حالت‌های دستی هم موجودند. ساختار سرویس‌های ثالث ممکن است تغییر کند.

فارسی‌یار محصولی مستقل است و وابسته به فونت ایران، OpenAI، Google یا Anthropic نیست.

## Privacy practices / Single purpose

**Single purpose — English:** Improve Persian typography and bidirectional Persian/English text display on websites explicitly enabled by the user.

**storage justification:** Stores user-selected display settings, per-domain preferences, local font names, and user-imported font files locally. No conversation content or browsing history is stored.

**activeTab justification:** Identifies the current website when the user opens the extension popup so they can configure or enable that domain.

**scripting justification:** Registers and injects the packaged local display engine into user-authorized pages, and applies settings to already open authorized tabs.

**Optional host permission justification:** User selects each domain and approves access before the extension processes text in that domain. Broad optional patterns allow any domain to be selected, but the shipped extension requests only specific domains, never blanket access to all sites.

**Remote code:** No remote executable code. All JavaScript is packaged. Bundled fonts are local; user font imports are binary font data, not scripts.

**Data handling:** No user data is transmitted to the developer or a third party. Page text and input text are processed ephemerally in the page for display. Domain preferences and imported fonts are stored in `chrome.storage.local`. Complete the current dashboard declarations to accurately describe local processing; do not claim the extension never reads text. It must inspect text to determine direction.

## تصاویر آماده

- `icon-128.png`: آیکن با padding شفاف.
- `promo-440x280.png`: تصویر تبلیغاتی کوچک.
- `options-1280x800.png`: اسکرین‌شات رابط واقعی تنظیمات، با API آزمایشی برای وضعیت نمونه.
- `bidi-lab-1280x800.png`: اسکرین‌شات آزمایشگاه داخلی؛ تصویر ChatGPT/Gemini/Claude نیست.
- `settings-1280x800.png`: بخش تنظیمات خواندن و افزودن فونت.

این تصاویر تجربهٔ رابط افزونه را نشان می‌دهند، نه تأیید یکپارچگی native یا وابستگی رسمی به سرویس‌ها.

## چک دستی قبل از ارسال

1. با manifest اصلی از Load unpacked نصب کنید؛ در `chrome://extensions` خطای Service Worker یا صفحه نداشته باشید.
2. فعال‌سازی دامنه را بزنید؛ درخواست Chrome باید فقط همان دامنه را نشان دهد. بعد از بستن و بازکردن مرورگر، تنظیمات اعمال شوند.
3. در حساب واقعی هر سه سرویس، یک پاسخ فارسی، یک پاسخ انگلیسی و یک پاسخ ترکیبی شامل `API_KEY`، URL، پرانتز، فهرست، جدول، کد و فرمول ایجاد کنید. جهت متن را در حالت‌های مختلف بررسی کنید.
4. هنگام تولید پاسخ، توقف پاسخ، ویرایش پیام و تغییر گفتگو بررسی کنید. در حین ترکیب حروف فارسی با IME و جابه‌جایی نشانگر، نوشتن عادی باقی بماند.
5. متن و بلوک کد را قبل و بعد از فعال‌سازی کپی کنید؛ محتوای متنی باید یکسان باشد. برای سنجش انتخاب، کپی و دسترس‌پذیری، این آزمایش دستی لازم است.
6. فونت شخصی دارای مجوز را وارد کنید؛ پس از بازکردن مجدد مرورگر انتخاب آن حفظ شود. فونت خراب باید رد شود. فونت حذف‌شده باید با وزیرمتن جایگزین شود.
7. دامنه را خاموش و سپس مجوز را لغو کنید؛ تغییرات نمایشی صفحهٔ باز برگردند و ثبت dynamic script حذف شود.
8. رابط تیره، بزرگ‌نمایی ۲۰۰٪، نویگیشن با Tab و پنجرهٔ باریک را بررسی کنید.
9. آدرس عمومی Privacy policy، ایمیل پشتیبانی، تصاویر و توضیحات را تکمیل کنید؛ فایل Chrome را بارگذاری و Submit for Review را انجام دهید.

## منابع رسمی بررسی‌شده، ۷ اکتبر ۲۰۲۶

- https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/publish
